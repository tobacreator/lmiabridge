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
    const goal = `Navigate to the search page. In the corporate name search field, enter the LEGAL NAME part of the company — if the input contains brackets like 'Clio (Themis Solutions Inc.)', search for only 'Themis Solutions Inc.' without the trading name.

The company to search for is: ${companyName}

Also try searching for just the first significant word if the full name returns no results.

Look through ALL results on the page carefully.
If ANY result shows a company name that matches or closely resembles the search term, return it as found.

Return this JSON:
{
  found: boolean,
  registeredName: string,
  status: string,
  incorporationDate: string,
  corporationNumber: string,
  note: string
}

If you find a result like 'Themis Solutions Inc.' when searching for 'Clio (Themis Solutions Inc.)', set found: true and use the registered name found.

Only return found: false if there are absolutely zero results after trying multiple search variations.`;

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
                if (data.type === 'COMPLETE' && data.result) resultJson = data.result;
                else if (data.resultJson) resultJson = data.resultJson;
              } catch (e) {}
            }
          }
        }

        if (resultJson) {
          // If found is false but a registeredName was returned,
          // treat it as found — TinyFish found the company but
          // marked it as not found due to name mismatch
          if (!resultJson.found && resultJson.registeredName && 
              resultJson.registeredName.length > 0) {
            resultJson.found = true;
            resultJson.note = 'Found under registered legal name: ' + resultJson.registeredName;
          }

          // Handle amalgamated/continued statuses as verified
          const statusLower = (resultJson.status || '').toLowerCase();
          const isVerified = resultJson.found === true && (
            statusLower.includes('active') ||
            statusLower.includes('amalgamated') ||
            statusLower.includes('continued') ||
            statusLower === '' // no status returned but found
          );

          let verificationNote = '';
          if (statusLower.includes('amalgamated')) {
            verificationNote = 'Company amalgamated — common for restructured corporations. Verified as legitimate Canadian business entity.';
          } else if (statusLower.includes('continued')) {
            verificationNote = 'Company continued under federal jurisdiction. Verified as legitimate Canadian business entity.';
          }

          const verificationStatus = isVerified ? 'verified' : (resultJson.found ? 'verified' : 'failed');

          try {
            await connectToDatabase();
            const updateFields: any = { 
              verificationStatus, 
              cra_bn: craBN || resultJson.corporationNumber 
            };
            if (verificationNote) updateFields.verificationNote = verificationNote;

            const emp = await Employer.findOneAndUpdate(
              { companyName },
              updateFields,
              { upsert: true, new: true }
            );
            console.log(`[Verify Employer] Status: ${verificationStatus} for ${companyName}, ID: ${emp._id}${verificationNote ? `, Note: ${verificationNote}` : ''}`);
            // Emit employerId so frontend can redirect with it
            await safeWrite(`data: ${JSON.stringify({ type: 'EMPLOYER_ID', employerId: emp._id.toString() })}\n\n`);
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
