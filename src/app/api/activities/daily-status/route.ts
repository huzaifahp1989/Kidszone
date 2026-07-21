import { NextResponse } from 'next/server';
import { getDailyActivityStatus } from '@/lib/daily-activity-limits';
import { DAILY_PLAN_TOTAL_POINTS, POINTS_DAILY_CAP } from '@/lib/points-policy';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await requireMatchingUser(req, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const status = await getDailyActivityStatus(auth.userId);
    return NextResponse.json({
      ...status,
      dailyCap: POINTS_DAILY_CAP,
      planTotal: DAILY_PLAN_TOTAL_POINTS,
    });
  } catch (error: any) {
    console.error('[activities/daily-status] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
