import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Worker from '@/lib/models/Worker';
import JobPosting from '@/lib/models/JobPosting';
import LMIAApplication from '@/lib/models/LMIAApplication';
import { groq, MODEL } from '@/lib/groq';
import { matchScoringPrompt } from '@/lib/groq-prompts';
import { runAgent } from '@/lib/tinyfish';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { workerId, jobPostingId } = await req.json();

    if (!workerId || !jobPostingId) {
      return NextResponse.json({ error: 'workerId and jobPostingId are required' }, { status: 400 });
    }

    // 1. Fetch worker and job
    const worker = await Worker.findById(workerId);
    const job = await JobPosting.findById(jobPostingId);

    if (!worker || !job) {
      return NextResponse.json({ error: 'Worker or Job Posting not found' }, { status: 404 });
    }

    // 2. Fetch wage data for the job's NOC & Province
    const wageUrl = `https://www.jobbank.gc.ca/trend-analysis/search-occupations?noc=${job.nocCode}&locationstring=${encodeURIComponent(job.province)}`;
    const wageGoal = "Find the median wage for this occupation. Return as JSON: { medianWage: number }";
    
    console.log(`[Match Engine] Fetching wage data for NOC ${job.nocCode} in ${job.province}...`);
    const wageData = await runAgent(wageUrl, wageGoal);
    const medianWage = wageData?.medianWage || 0;

    // 3. Run Groq Match Scoring
    const prompt = matchScoringPrompt(worker, job, medianWage);
    console.log('[Match Engine] Running Groq Match Scoring...');
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.1,
    });

    const rawResponse = completion.choices[0]?.message?.content || '';
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawResponse;

    let matchResult;
    try {
      matchResult = JSON.parse(cleanJson);
    } catch (e) {
      console.error('[Match Engine] Groq Parse Error:', e);
      return NextResponse.json({ error: 'parsing_failed', raw: rawResponse }, { status: 500 });
    }

    // 4. Save to LMIAApplication
    const application = await LMIAApplication.findOneAndUpdate(
      { employer: job.employer || null, worker: worker._id, jobPosting: job._id },
      {
        employer: job.employer || null,
        worker: worker._id,
        jobPosting: job._id,
        matchScore: matchResult.totalScore || 0,
        matchDetails: matchResult,
        complianceStatus: matchResult.lmiaViable ? 'viable' : 'at_risk',
        gtsEligible: matchResult.totalScore > 80, // placeholder logic
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      applicationId: application._id,
      matchResult
    });

  } catch (error: any) {
    console.error('[Match Engine] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
