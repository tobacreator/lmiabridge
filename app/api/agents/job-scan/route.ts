import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import JobPosting from '@/lib/models/JobPosting';
import Employer from '@/lib/models/Employer'; // Ensure Employer model is registered
import agentops from '@/lib/agentops';

export const dynamic = 'force-dynamic';
// export const runtime = 'edge';

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;
const TINYFISH_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';

export async function GET() {
  return NextResponse.json({ status: 'healthy', agent: 'job-scan' });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[Job Scan] Starting scan...');
  try {
    if (process.env.AGENTOPS_API_KEY) {
      await agentops.init({ apiKey: process.env.AGENTOPS_API_KEY });
    }
  } catch (e) {
    console.error('[AgentOps] Error:', e);
  }

  if (!TINYFISH_API_KEY) {
    return NextResponse.json({ error: 'TINYFISH_API_KEY is missing' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { nocCode, province } = body;
    const searchUrl = `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=&locationstring=${encodeURIComponent(province)}&mid=&noc=${nocCode}&fsrc=16`;
    const goal = "Find all job listings on this page. For each job extract: jobTitle, employer, location, salary (if shown), postedDate, jobUrl. Return as JSON array named 'jobs'. If no jobs found, return empty array.";

    const response = await fetch(TINYFISH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TINYFISH_API_KEY
      },
      body: JSON.stringify({
        url: searchUrl,
        goal: goal
      })
    });

    if (!response.ok) {
        throw new Error(`TinyFish API failed: ${response.statusText}`);
    }

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
          console.warn('[Job Scan] Write failed (probably disconnected)');
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
                    if (data.type === 'COMPLETE' || data.resultJson) {
                        resultJson = data.resultJson;
                    }
                } catch (e) {}
            }
          }
        }

        if (resultJson?.jobs && Array.isArray(resultJson.jobs)) {
          console.log(`[Job Scan] Found ${resultJson.jobs.length} jobs. Saving to MongoDB...`);
          try {
            await connectToDatabase();
            
            for (const job of resultJson.jobs) {
              await JobPosting.create({
                  jobTitle: job.jobTitle || job.title || 'Unknown Role',
                  nocCode: nocCode,
                  wage: parseFloat(String(job.salary || job.wage || '0').replace(/[^0-9.]/g, '') || '0'), 
                  province: province,
                  employer: null, 
                  postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
                  sourceUrl: job.jobUrl || job.url,
                  tinyfishRunId: runId,
              }).catch(err => console.error('[Job Scan] DB Create Error:', err));
            }
          } catch (dbErr) {
            console.error('[Job Scan] DB Connection Error:', dbErr);
          }
        }
      } catch (err: any) {
        console.error('[Job Scan] Stream Processing Error:', err);
        // Fallback to MongoDB seed jobs
        try {
          await connectToDatabase();
          const seedJobs = await JobPosting.find({}).limit(5).lean();
          const fallbackData = JSON.stringify({
            type: 'COMPLETE',
            resultJson: {
              jobs: seedJobs.map((j: any) => ({
                jobTitle: j.jobTitle,
                employer: 'Themis Solutions Inc.',
                location: j.province,
                salary: `$${j.wage?.toLocaleString()} annually`,
                postedDate: new Date(j.createdAt).toLocaleDateString(),
                jobUrl: j.sourceUrl,
                _id: j._id
              }))
            },
            fallback: true,
            error: err.message
          });
          await safeWrite(`data: ${fallbackData}\n\n`);
        } catch (dbErr) {
          const errorMsg = JSON.stringify({ error: err.message, fallback: true, jobs: [] });
          await safeWrite(`data: ${errorMsg}\n\n`);
        }
      } finally {
        clearInterval(heartbeat);
        const duration = Date.now() - startTime;
        console.log(`[Job Scan] Completed in ${duration}ms. Run ID: ${runId}`);
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
      },
    });

  } catch (error: any) {
    console.error('[Job Scan] Request Error:', error);
    // Fallback to MongoDB seed jobs on outer error
    try {
      await connectToDatabase();
      const seedJobs = await JobPosting.find({}).limit(5).lean();
      return NextResponse.json({
        jobs: seedJobs.map((j: any) => ({
          jobTitle: j.jobTitle,
          employer: 'Themis Solutions Inc.',
          location: j.province,
          salary: `$${j.wage?.toLocaleString()} annually`,
          postedDate: new Date(j.createdAt).toLocaleDateString(),
          jobUrl: j.sourceUrl,
          _id: j._id
        })),
        fallback: true,
        error: error.message
      });
    } catch {
      return NextResponse.json({ 
        jobs: [], 
        error: error.message, 
        fallback: true 
      }, { status: 500 });
    }
  }
}
