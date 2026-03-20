import { NextRequest, NextResponse } from 'next/server';
import agentops from '@/lib/agentops';
import connectToDatabase from '@/lib/mongodb';
import WageCache from '@/lib/models/WageCache';

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export async function GET() {
  return NextResponse.json({ status: 'healthy', agent: 'wage-lookup' });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    if (process.env.AGENTOPS_API_KEY) {
      await agentops.init({ apiKey: process.env.AGENTOPS_API_KEY });
    }
  } catch (e) {
    console.error('[AgentOps] Error:', e);
  }
  if (!TINYFISH_API_KEY) return NextResponse.json({ error: 'TINYFISH_API_KEY missing' }, { status: 500 });

  try {
    const { nocCode, province } = await req.json();

    // Check MongoDB cache first (24hr TTL)
    await connectToDatabase();
    const cached = await WageCache.findOne({
      nocCode,
      province,
      cachedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (cached) {
      console.log(`[Wage Lookup] Cache HIT for NOC ${nocCode} / ${province}`);
      return NextResponse.json({
        ...cached.data,
        nocCode,
        province,
        cached: true,
        runId: cached.tinyfishRunId
      });
    }

    console.log(`[Wage Lookup] Cache MISS for NOC ${nocCode} / ${province} — calling TinyFish`);
    const searchUrl = `https://www.jobbank.gc.ca/wagereport/occupation/${nocCode}`;
    const goal = `Extract the median wage, wage range (low to high), and job outlook for this occupation page. Look for salary/wage tables or wage report sections. Return: { medianWage: number, wageLow: number, wageHigh: number, currency: 'CAD', period: 'hourly'|'annual', province: string, nocCode: string, outlook: string }`;

    const response = await fetch(TINYFISH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': TINYFISH_API_KEY },
      body: JSON.stringify({ url: searchUrl, goal })
    });

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      let resultJson: any = null;
      let runId: string | null = null;
      let buffer = '';
      const reader = response.body?.getReader();
      if (!reader) {
        try { await writer.close(); } catch (e) {}
        return;
      }

      const safeWrite = async (data: string) => {
        try {
          await writer.write(encoder.encode(data));
        } catch (e) {
          console.warn('[Wage Lookup] Write failed (probably disconnected)');
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          await safeWrite(chunk);

          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.run_id) runId = data.run_id;
                if (data.type === 'COMPLETE' || data.resultJson) resultJson = data.resultJson;
              } catch (e) {}
            }
          }
        }
        if (resultJson) {
          console.log('[Wage Lookup] Data extracted:', resultJson);
          // Save to cache
          try {
            await WageCache.findOneAndUpdate(
              { nocCode, province },
              { nocCode, province, data: resultJson, tinyfishRunId: runId, cachedAt: new Date() },
              { upsert: true }
            );
            console.log('[Wage Lookup] Cached result in MongoDB');
          } catch (cacheErr) {
            console.error('[Wage Lookup] Cache save error:', cacheErr);
          }
        }
      } catch (err: any) {
         console.error('[Wage Lookup] Stream Error:', err);
         await safeWrite(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      } finally {
        console.log(`[Wage Lookup] Finished in ${Date.now() - startTime}ms. Run ID: ${runId}`);
        try {
          await writer.close();
        } catch (e) {}
      }
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
