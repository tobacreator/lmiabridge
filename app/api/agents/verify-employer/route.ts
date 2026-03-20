import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Employer from '@/lib/models/Employer';
import agentops from '@/lib/agentops';

// export const runtime = 'edge';

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export async function GET() {
  return NextResponse.json({ status: 'healthy', agent: 'verify-employer' });
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
    const { companyName, province, craBN } = await req.json();
    const searchUrl = "https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html";
    const goal = `Search for the company named ${companyName}. Navigate to the search box, enter the company name, submit the form, and return the first result: { found: boolean, registeredName: string, status: string, incorporationDate: string, corporationNumber: string }. If not found, return { found: false }.`;

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
          console.warn('[Verify Employer] Write failed (probably disconnected)');
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
          try {
            await connectToDatabase();
            const verificationStatus = resultJson.found ? 'verified' : 'failed';
            await Employer.findOneAndUpdate(
              { companyName },
              { verificationStatus, cra_bn: craBN || resultJson.corporationNumber },
              { upsert: true }
            );
          } catch (dbErr) {
            console.error('[Verify Employer] DB Error:', dbErr);
          }
        }
      } catch (err: any) {
        console.error('[Verify Employer] Stream Error:', err);
        await safeWrite(`data: ${JSON.stringify({ error: err.message, found: false })}\n\n`);
      } finally {
        console.log(`[Verify Employer] Finished in ${Date.now() - startTime}ms. Run ID: ${runId}`);
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
