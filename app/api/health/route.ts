import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agents: {
      jobScan: 'ready',
      employerVerify: 'ready',
      wageLookup: 'ready',
      complianceCheck: 'ready'
    },
    models: { groq: 'llama-3.3-70b-versatile' },
    version: '1.0.0-tinyfish-accelerator'
  });
}
