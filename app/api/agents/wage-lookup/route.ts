import { NextRequest, NextResponse } from 'next/server';
import agentops from '@/lib/agentops';
import connectToDatabase from '@/lib/mongodb';
import WageCache from '@/lib/models/WageCache';
import nocJobBankIds from '@/data/noc-jobbank-ids.json';

export const dynamic = 'force-dynamic';

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

    // Look up Job Bank ID for this NOC code
    const jobBankId = (nocJobBankIds as Record<string, string>)[nocCode];
    if (!jobBankId) {
      return NextResponse.json({
        error: 'NOC code not in lookup table',
        nocCode,
        message: 'This NOC code does not have a Job Bank wage page mapped yet'
      }, { status: 404 });
    }

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

    console.log(`[Wage Lookup] Cache MISS for NOC ${nocCode} / ${province} — calling TinyFish with Job Bank ID ${jobBankId}`);
    const searchUrl = `https://www.jobbank.gc.ca/marketreport/wages-occupation/${jobBankId}/${province}`;
    const goal = `This is a Job Bank wage report page for a specific occupation in Canada.
Find and extract:
- The occupation title (shown in the page heading)
- The median hourly wage (look for a wage table or wage statistics section)
- The low hourly wage
- The high hourly wage
- The employment outlook if shown (Good, Fair, or Limited)
Return ONLY this JSON:
{
  "medianWage": number,
  "wageLow": number,
  "wageHigh": number,
  "currency": "CAD",
  "period": "hourly",
  "occupation": string,
  "outlook": string
}`;

    console.log(`[Wage Lookup] Calling TinyFish for NOC ${nocCode} / ${province}`);
    const response = await fetch(TINYFISH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': TINYFISH_API_KEY },
      body: JSON.stringify({ url: searchUrl, goal })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error(`[Wage Lookup] TinyFish API error: ${response.status} ${errText}`);
      throw new Error(`TinyFish API failed: ${response.status}`);
    }
    console.log('[Wage Lookup] TinyFish stream started');

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

      // Heartbeat to prevent Vercel from closing the connection
      const heartbeat = setInterval(() => {
        try {
          writer.write(encoder.encode('data: {"type":"HEARTBEAT"}\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

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
                if (data.type === 'COMPLETE' && data.result) resultJson = data.result;
                else if (data.resultJson) resultJson = data.resultJson;
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
        clearInterval(heartbeat);
        console.log(`[Wage Lookup] Finished in ${Date.now() - startTime}ms. Run ID: ${runId}`);
        try {
          await writer.close();
        } catch (e) {}
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
