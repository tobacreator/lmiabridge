import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';
import Worker from '@/lib/models/Worker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Get all LMIA applications with populated worker data
    const apps = await LMIAApplication.find({})
      .populate('worker')
      .lean();

    const workers = apps
      .filter((app: any) => app.worker)
      .map((app: any) => ({
        _id: app.worker._id.toString(),
        name: app.worker.name || 'Unknown',
        nocCode: app.worker.nocCode || app.worker.targetNOC || '',
        matchScore: app.matchDetails?.totalScore || app.matchScore || 0,
        location: `${app.worker.desiredProvince || 'ON'}`,
        country: app.worker.country || 'Unknown',
        educationLevel: app.worker.educationLevel || '',
        languageScore: app.worker.languageScore || '',
        salaryExpectation: app.worker.salaryExpectation || 0,
        status: getStatus(app.matchDetails?.totalScore || app.matchScore || 0),
        matchDetails: app.matchDetails || null,
        gtsEligible: app.gtsEligible || false,
        lmiaPathway: (app as any).lmiaPathway || null,
        applicationId: (app as any)._id?.toString() || null,
        complianceStatus: (app as any).complianceStatus || 'pending',
        summary: app.matchDetails?.summary || '',
      }));

    return NextResponse.json(workers);
  } catch (error: any) {
    console.error('[Workers API] Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

function getStatus(score: number): string {
  if (score >= 80) return 'Optimal';
  if (score >= 60) return 'Viable';
  if (score >= 40) return 'Review';
  return 'At Risk';
}
