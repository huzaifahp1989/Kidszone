import { NextResponse } from 'next/server';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const points = Number(body?.points);
    const countTowardDailyLimit = body?.countTowardDailyLimit !== false;

    if (!Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: 'points must be greater than 0' }, { status: 400 });
    }

    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error || 'Could not prepare user profile.' }, { status: 500 });
    }

    const result = await awardPointsWithDailyCapByUserId(userId, points, {
      countTowardDailyLimit,
      successMessage: `+${points} points added.`,
    });

    return NextResponse.json({
      success: result.success,
      reason: result.reason,
      message: result.message,
      points_awarded: result.pointsAwarded,
      total_points: result.totalPoints,
      weekly_points: result.weeklyPoints,
      monthly_points: result.monthlyPoints,
      today_points: result.todayPoints,
      daily_limit: result.dailyLimit,
      badges: result.badges,
      level: result.level,
    });
  } catch (error: any) {
    console.error('[points/award] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
