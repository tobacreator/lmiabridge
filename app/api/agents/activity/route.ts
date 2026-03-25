import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AgentRun from '@/lib/models/AgentRun';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const agentRuns = await AgentRun.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const runs = agentRuns.map((run: any) => ({
      runId: run.runId || 'unknown',
      timestamp: run.createdAt ? new Date(run.createdAt).toISOString().slice(0, 16).replace('T', ' ') : 'N/A',
      agent: run.agent,
      status: run.status || 'COMPLETE',
      duration: run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A',
    }));

    return NextResponse.json(runs);
  } catch (error: any) {
    console.error('[Agent Activity] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
