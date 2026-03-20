import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';
import Employer from '@/lib/models/Employer';
import JobPosting from '@/lib/models/JobPosting';
import Worker from '@/lib/models/Worker';

// Force dynamic so we don't cache stale data
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Matches API] GET request received');
    await connectToDatabase();
    console.log('[Matches API] Connected to DB');
    
    const apps = await LMIAApplication.find({})
      .populate('employer')
      .populate('jobPosting')
      .lean();
    
    console.log(`[Matches API] Found ${apps.length} applications`);
    
    const matches = apps.map((app: any) => {
      try {
        return {
          _id: app._id.toString(),
          lmiaApplicationId: app._id.toString(), 
          jobTitle: app.jobPosting?.jobTitle || 'Unknown Role',
          employerName: app.employer?.companyName || 'Unknown Employer',
          location: `${app.jobPosting?.province || 'ON'}, Canada`,
          wage: app.jobPosting?.wage || 0,
          medianWage: 48, 
          matchDetails: app.matchDetails || {
            nocAlignment: 0,
            wageCompliance: 0,
            regionMatch: 0,
            languageScore: 0,
            educationMatch: 0,
            totalScore: 0,
            summary: "Pending scoring",
            lmiaViable: false
          },
          gtsEligible: app.gtsEligible || false,
        };
      } catch (mapErr) {
        console.error('[Matches API] Error mapping app:', app._id, mapErr);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(matches);
  } catch (error: any) {
    console.error('[Matches API] Global Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
