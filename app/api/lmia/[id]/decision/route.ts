import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { lmiaDecision, lmiaDecisionDate } = await req.json();
    const { id } = params;

    if (!['positive', 'negative'].includes(lmiaDecision)) {
      return NextResponse.json({ error: 'lmiaDecision must be positive or negative' }, { status: 400 });
    }

    const app = await LMIAApplication.findByIdAndUpdate(
      id,
      {
        lmiaDecision,
        lmiaDecisionDate: lmiaDecisionDate ? new Date(lmiaDecisionDate) : new Date(),
      },
      { new: true }
    ).populate('worker').lean();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // If positive decision, log it (Composio email integration placeholder)
    if (lmiaDecision === 'positive') {
      const workerName = (app as any).worker?.name || 'Candidate';
      console.log(`[LMIA Decision] POSITIVE for ${workerName} — trigger notification email`);
    }

    return NextResponse.json(app);
  } catch (error: any) {
    console.error('[LMIA Decision] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
