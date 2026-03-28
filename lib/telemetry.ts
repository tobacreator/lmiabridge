import type { NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TelemetryEvent from '@/lib/models/TelemetryEvent';

export async function logTelemetryEvent(
  req: NextRequest | undefined,
  event: {
    type: string;
    path?: string;
    agent?: string;
    runId?: string | null;
    status?: string;
    meta?: Record<string, any>;
  }
) {
  try {
    const ip =
      req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req?.headers.get('x-real-ip') ||
      undefined;

    const userAgent = req?.headers.get('user-agent') || undefined;
    const referer = req?.headers.get('referer') || undefined;

    await connectToDatabase();
    await TelemetryEvent.create({
      ...event,
      runId: typeof event.runId === 'string' ? event.runId : undefined,
      ip,
      userAgent,
      referer,
    });
  } catch {}
}
