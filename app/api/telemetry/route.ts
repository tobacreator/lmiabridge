import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TelemetryEvent from '@/lib/models/TelemetryEvent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, path, agent, runId, status, meta } = body || {};

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Missing telemetry type' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;

    const userAgent = req.headers.get('user-agent') || undefined;
    const referer = req.headers.get('referer') || undefined;

    await connectToDatabase();
    await TelemetryEvent.create({
      type,
      path: typeof path === 'string' ? path : undefined,
      agent: typeof agent === 'string' ? agent : undefined,
      runId: typeof runId === 'string' ? runId : undefined,
      status: typeof status === 'string' ? status : undefined,
      meta: meta && typeof meta === 'object' ? meta : undefined,
      ip,
      userAgent,
      referer,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'telemetry_error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const expected = process.env.TELEMETRY_READ_TOKEN || '';

  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitRaw = req.nextUrl.searchParams.get('limit') || '100';
  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 100, 1), 500);

  const type = req.nextUrl.searchParams.get('type') || undefined;
  const agent = req.nextUrl.searchParams.get('agent') || undefined;

  await connectToDatabase();
  const query: Record<string, any> = {};
  if (type) query.type = type;
  if (agent) query.agent = agent;

  const events = await TelemetryEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return NextResponse.json({ events });
}
