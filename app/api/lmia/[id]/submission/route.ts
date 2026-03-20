import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { lmiaReferenceNumber, lmiaSubmittedAt } = await req.json();
    const { id } = params;

    if (!lmiaReferenceNumber) {
      return NextResponse.json({ error: 'lmiaReferenceNumber is required' }, { status: 400 });
    }

    const app = await LMIAApplication.findByIdAndUpdate(
      id,
      {
        lmiaReferenceNumber,
        lmiaSubmittedAt: lmiaSubmittedAt ? new Date(lmiaSubmittedAt) : new Date(),
      },
      { new: true }
    ).lean();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error: any) {
    console.error('[LMIA Submission] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
