import { NextResponse } from 'next/server';
import {
  getNextWeeklyStarTarget,
  getWeeklyStarsFromActiveDays,
  MAX_WEEKLY_STARS,
  WEEKLY_STAR_DAY_THRESHOLDS,
} from '@/lib/leaderboard-rules';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { getWeeklyScoresForUsers } from '@/lib/weekly-score';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function renderStars(stars: number): string {
  if (stars <= 0) return 'No stars yet';
  return `${'⭐'.repeat(stars)} (${stars}/${MAX_WEEKLY_STARS})`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { weekStartIso, weekEndIso, weekStartDate, weekEndDate } = getScoreWeekRangeUtc();
    const weeklyScoreByUser = await getWeeklyScoresForUsers([userId], weekStartIso, weekEndIso);
    const activeDays = Number(weeklyScoreByUser.get(userId) || 0);
    const stars = getWeeklyStarsFromActiveDays(activeDays);
    const nextTarget = getNextWeeklyStarTarget(activeDays);

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('monthly_points,total_points')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      week: {
        weekStartDate,
        weekEndDate,
        weekStartIso,
        weekEndIso,
      },
      activeDays,
      weeklyStars: stars,
      maxWeeklyStars: MAX_WEEKLY_STARS,
      thresholds: [...WEEKLY_STAR_DAY_THRESHOLDS],
      starsLabel: renderStars(stars),
      nextTarget,
      daysToNextStar: nextTarget == null ? 0 : Math.max(0, nextTarget - activeDays),
      monthlyPoints: Number(pointsRow?.monthly_points || 0),
      totalPoints: Number(pointsRow?.total_points || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
