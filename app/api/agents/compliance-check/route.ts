import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Employer from '@/lib/models/Employer';
import agentops from '@/lib/agentops';

// export const runtime = 'edge';

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export async function GET() {
  return NextResponse.json({ status: 'healthy', agent: 'compliance-check' });
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
    const { companyName, craBN } = await req.json();
    const searchUrl = "https://www.canada.ca/en/employment-social-development/services/foreign-workers/employer-compliance.html";
    const goal = `Search for the employer named ${companyName} on this page or any linked compliance/non-compliant employer list. Return: { isCompliant: boolean, onBlacklist: boolean, violations: string[], lastChecked: string }. If you cannot find the employer listed, return { isCompliant: true, onBlacklist: false, violations: [], note: 'not found in non-compliant list' }`;

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
          console.warn('[Compliance Check] Write failed (probably disconnected)');
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
             if (resultJson.onBlacklist) {
                  await Employer.findOneAndUpdate(
                      { companyName },
                      { verificationStatus: 'failed' }
                  );
                  console.warn(`[Compliance Check] Employer ${companyName} blacklisted!`);
             }
           } catch (dbErr) {
             console.error('[Compliance Check] DB Error:', dbErr);
           }
        }
      } catch (err: any) {
        console.error('[Compliance Check] Stream Error:', err);
        await safeWrite(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      } finally {
        console.log(`[Compliance Check] Finished in ${Date.now() - startTime}ms. Run ID: ${runId}`);
        try {
          await writer.close();
        } catch (e) {}
      }
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
