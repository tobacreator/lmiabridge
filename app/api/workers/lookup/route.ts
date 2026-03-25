import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Worker from '@/lib/models/Worker';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const worker = await Worker.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!worker) {
      return NextResponse.json({ error: 'No profile found for this email' }, { status: 404 });
    }

    const applications = await LMIAApplication.find({ worker: (worker as any)._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      workerId: (worker as any)._id.toString(),
      name: (worker as any).name,
      nocCode: (worker as any).nocCode,
      matchCount: applications.length,
      hasMatches: applications.length > 0,
    });
  } catch (error: any) {
    console.error('[Worker Lookup] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
