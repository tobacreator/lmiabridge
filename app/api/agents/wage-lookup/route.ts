import { NextRequest, NextResponse } from 'next/server';
import agentops from '@/lib/agentops';
import connectToDatabase from '@/lib/mongodb';
import WageCache from '@/lib/models/WageCache';
import nocJobBankIds from '@/data/noc-jobbank-ids.json';
import AgentRun from '@/lib/models/AgentRun';

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

    // Helper: call TinyFish and consume SSE server-side, return extracted result
    const callTinyFish = async (attempt: number): Promise<{ result: any; runId: string | null; cancelled: boolean }> => {
      console.log(`[Wage Lookup] Attempt ${attempt}: Calling TinyFish for NOC ${nocCode} / ${province}`);
      const tfResponse = await fetch(TINYFISH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': TINYFISH_API_KEY! },
        body: JSON.stringify({ url: searchUrl, goal })
      });

      if (!tfResponse.ok) {
        const errText = await tfResponse.text().catch(() => 'unknown');
        throw new Error(`TinyFish API error ${tfResponse.status}: ${errText}`);
      }

      const reader = tfResponse.body?.getReader();
      if (!reader) throw new Error('No response body from TinyFish');

      const decoder = new TextDecoder();
      let buffer = '';
      let resultJson: any = null;
      let runId: string | null = null;
      let cancelled = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') || trimmed.startsWith('data:')) {
            const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
            try {
              const data = JSON.parse(jsonStr);
              if (data.run_id) runId = data.run_id;
              if (data.type === 'COMPLETE') {
                if (data.status === 'CANCELLED') {
                  console.warn(`[Wage Lookup] Run ${runId} was CANCELLED`);
                  cancelled = true;
                } else if (data.result) {
                  resultJson = data.result;
                } else if (data.resultJson) {
                  resultJson = data.resultJson;
                }
              }
            } catch {}
          }
        }
      }

      return { result: resultJson, runId, cancelled };
    }

    // Attempt 1
    let tfResult = await callTinyFish(1);

    // Retry once if cancelled
    if (tfResult.cancelled && !tfResult.result) {
      console.log('[Wage Lookup] Retrying after cancellation...');
      await new Promise(r => setTimeout(r, 2000));
      tfResult = await callTinyFish(2);
    }

    if (tfResult.result) {
      console.log('[Wage Lookup] Data extracted:', tfResult.result);
      // Save to cache
      try {
        await WageCache.findOneAndUpdate(
          { nocCode, province },
          { nocCode, province, data: tfResult.result, tinyfishRunId: tfResult.runId, cachedAt: new Date() },
          { upsert: true }
        );
        console.log('[Wage Lookup] Cached result in MongoDB');
      } catch (cacheErr) {
        console.error('[Wage Lookup] Cache save error:', cacheErr);
      }

      const duration = Date.now() - startTime;
      console.log(`[Wage Lookup] Success in ${duration}ms. Run ID: ${tfResult.runId}`);

      // Record agent run
      try {
        await AgentRun.create({ agent: 'WAGE_LOOKUP', runId: tfResult.runId || 'unknown', status: 'COMPLETE', duration, meta: { nocCode, province } });
      } catch (e) { console.error('[Wage Lookup] AgentRun save error:', e); }

      return NextResponse.json({
        ...tfResult.result,
        nocCode,
        province,
        cached: false,
        runId: tfResult.runId
      });
    }

    // No result — return error
    const duration = Date.now() - startTime;
    console.error(`[Wage Lookup] No result after ${duration}ms. Cancelled: ${tfResult.cancelled}`);
    return NextResponse.json({
      error: tfResult.cancelled ? 'TinyFish run was cancelled' : 'No wage data extracted',
      nocCode,
      province
    }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
