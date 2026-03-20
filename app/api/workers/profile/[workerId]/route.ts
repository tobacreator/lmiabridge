import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Worker from '@/lib/models/Worker';
import LMIAApplication from '@/lib/models/LMIAApplication';

export async function GET(req: NextRequest, { params }: { params: { workerId: string } }) {
  try {
    await connectToDatabase();
    const { workerId } = params;

    const worker = await Worker.findById(workerId).lean();
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const applications = await LMIAApplication.find({ worker: workerId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ worker, applications });
  } catch (error: any) {
    console.error('[Worker Profile] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
