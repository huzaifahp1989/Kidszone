import { NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { runPointsHealthCheck } from '@/lib/points-health';

export const dynamic = 'force-dynamic';

/**
 * Scheduled points/Supabase guardian.
 * Read-only diagnostics — never awards or mutates points.
 * Returns 503 when critical issues are found so monitors/alerting can page.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await runPointsHealthCheck();

    if (!report.ok) {
      console.error(
        '[cron/points-health] CRITICAL points/Supabase issues:',
        report.issues.filter((i) => i.severity === 'critical').map((i) => i.code)
      );
    } else if (report.issues.length) {
      console.warn(
        '[cron/points-health] warnings:',
        report.issues.map((i) => i.code)
      );
    } else {
      console.log('[cron/points-health] ok', report.checkedAt);
    }

    return NextResponse.json(
      {
        success: report.ok,
        ...report,
      },
      { status: report.ok ? 200 : 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[cron/points-health]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
