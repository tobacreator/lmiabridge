import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { pathway } = await req.json();
    const { id } = params;

    if (!['gts', 'standard'].includes(pathway)) {
      return NextResponse.json({ error: 'Invalid pathway. Must be gts or standard.' }, { status: 400 });
    }

    const app = await LMIAApplication.findByIdAndUpdate(
      id,
      { lmiaPathway: pathway },
      { new: true }
    ).lean();

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error: any) {
    console.error('[LMIA Pathway] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
