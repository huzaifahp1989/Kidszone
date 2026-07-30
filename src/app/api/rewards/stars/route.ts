import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getMonthKeysForQuarter,
  getMonthStartUtc,
  getQuarterKey,
  isEligibleForQuarterlyDraw,
  MONTHLY_STAR_MIN_POINTS,
  QUARTERLY_DRAW_MIN_STARS,
} from '@/lib/leaderboard-rules';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const quarterKey = getQuarterKey();
    const monthKeys = getMonthKeysForQuarter(quarterKey);
    const monthStarts = monthKeys.map((k) => `${k}-01`);
    const currentMonthStart = getMonthStartUtc().toISOString().slice(0, 10);

    const [progressRes, pointsRes] = await Promise.all([
      supabaseAdmin
        .from('user_monthly_progress')
        .select('month_start, leaderboard_monthly_points, total_points, star_earned, star_awarded_at')
        .eq('user_id', userId)
        .in('month_start', monthStarts)
        .order('month_start', { ascending: true }),
      supabaseAdmin
        .from('users_points')
        .select('monthly_points, stars_this_quarter, quarter_key, total_points')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const months = monthKeys.map((key) => {
      const start = `${key}-01`;
      const row = (progressRes.data || []).find(
        (r: any) => String(r.month_start).slice(0, 10) === start
      );
      const isCurrent = start === currentMonthStart;
      const leaderboardPoints = isCurrent
        ? Number(pointsRes.data?.monthly_points || 0)
        : Number((row as any)?.leaderboard_monthly_points ?? (row as any)?.total_points ?? 0);
      const starEarned = isCurrent
        ? leaderboardPoints >= MONTHLY_STAR_MIN_POINTS
        : Boolean((row as any)?.star_earned);

      return {
        key,
        monthStart: start,
        isCurrent,
        points: leaderboardPoints,
        starEarned,
        pointsToStar: Math.max(0, MONTHLY_STAR_MIN_POINTS - leaderboardPoints),
      };
    });

    const starsEarned = months.filter((m) => m.starEarned).length;
    const rollupStars =
      String(pointsRes.data?.quarter_key || '') === quarterKey
        ? Number(pointsRes.data?.stars_this_quarter || 0)
        : starsEarned;

    return NextResponse.json({
      quarterKey,
      monthlyStarMinPoints: MONTHLY_STAR_MIN_POINTS,
      quarterlyDrawMinStars: QUARTERLY_DRAW_MIN_STARS,
      starsThisQuarter: Math.max(starsEarned, rollupStars),
      eligibleForQuarterlyDraw: isEligibleForQuarterlyDraw(Math.max(starsEarned, rollupStars)),
      months,
      currentMonthlyPoints: Number(pointsRes.data?.monthly_points || 0),
      totalPoints: Number(pointsRes.data?.total_points || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
