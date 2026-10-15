import { NextResponse } from 'next/server';
import { runPointsHealthCheck } from '@/lib/points-health';

export const dynamic = 'force-dynamic';

/**
 * Public points + Supabase health probe (read-only).
 * Use for uptime monitors and quick diagnosis of "points not working".
 */
export async function GET() {
  try {
    const report = await runPointsHealthCheck();
    return NextResponse.json(report, { status: report.ok ? 200 : 503 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        issues: [
          {
            code: 'health_check_crashed',
            severity: 'critical',
            message,
            fixHint: 'Inspect server logs for /api/health/points.',
          },
        ],
        checks: {},
      },
      { status: 503 }
    );
  }
}
