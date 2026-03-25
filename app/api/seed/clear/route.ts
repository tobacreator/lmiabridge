import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Worker from '@/lib/models/Worker';
import Employer from '@/lib/models/Employer';
import JobPosting from '@/lib/models/JobPosting';
import LMIAApplication from '@/lib/models/LMIAApplication';
import AgentRun from '@/lib/models/AgentRun';
import WageCache from '@/lib/models/WageCache';

export async function DELETE() {
  try {
    await connectToDatabase();
    await Worker.deleteMany({});
    await Employer.deleteMany({});
    await JobPosting.deleteMany({});
    await LMIAApplication.deleteMany({});
    await AgentRun.deleteMany({});
    await WageCache.deleteMany({});
    return NextResponse.json({ cleared: true });
  } catch (error: any) {
    console.error('[Seed Clear] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
