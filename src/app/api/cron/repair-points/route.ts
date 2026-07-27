import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { runPointsRepairBatch } from '@/lib/points-repair';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runPointsRepairBatch({ triggerSource: 'cron' });
    return NextResponse.json({
      success: true,
      message: 'Points repair completed',
      ...summary,
      details: summary.details.slice(0, 50),
    });
  } catch (error: any) {
    console.error('[cron/repair-points]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
