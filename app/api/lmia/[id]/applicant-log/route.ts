import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { applicantName, dateApplied, reasonNotSuitable } = await req.json();
    const { id } = params;

    if (!applicantName || !reasonNotSuitable) {
      return NextResponse.json({ error: 'applicantName and reasonNotSuitable are required' }, { status: 400 });
    }

    const app = await LMIAApplication.findByIdAndUpdate(
      id,
      {
        $push: {
          canadianApplicantLog: {
            applicantName,
            dateApplied: dateApplied ? new Date(dateApplied) : new Date(),
            reasonNotSuitable,
            loggedAt: new Date()
          }
        }
      },
      { new: true }
    ).lean();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ canadianApplicantLog: (app as any).canadianApplicantLog });
  } catch (error: any) {
    console.error('[LMIA Applicant Log] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
