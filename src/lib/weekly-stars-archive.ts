import { supabaseAdmin } from '@/lib/supabase-admin';
import { getWeeklyStarsFromActiveDays } from '@/lib/leaderboard-rules';
import { getPreviousScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { getAllScoreWeekActiveUserIds, getWeeklyScoresForUsers } from '@/lib/weekly-score';

export type WeeklyStarsArchiveSummary = {
  weekStartDate: string;
  weekEndDate: string;
  usersConsidered: number;
  rowsArchived: number;
  skipped: boolean;
  reason?: string;
};

export async function archivePreviousWeeklyStars(): Promise<WeeklyStarsArchiveSummary> {
  const { weekStartIso, weekEndIso, weekStartDate, weekEndDate } = getPreviousScoreWeekRangeUtc();

  const [activeUserIds, pointsRes] = await Promise.all([
    getAllScoreWeekActiveUserIds(weekStartIso, weekEndIso),
    supabaseAdmin
      .from('users_points')
      .select('user_id,weekly_points,monthly_points,total_points')
      .gt('weekly_points', 0),
  ]);

  if (pointsRes.error) {
    throw pointsRes.error;
  }

  const pointsByUserId = new Map<string, { weekly: number; monthly: number; total: number }>();
  for (const row of pointsRes.data || []) {
    const userId = String((row as any).user_id || '');
    if (!userId) continue;
    pointsByUserId.set(userId, {
      weekly: Number((row as any).weekly_points || 0),
      monthly: Number((row as any).monthly_points || 0),
      total: Number((row as any).total_points || 0),
    });
  }

  const allUserIds = [...new Set([...activeUserIds, ...pointsByUserId.keys()])];
  if (!allUserIds.length) {
    return {
      weekStartDate,
      weekEndDate,
      usersConsidered: 0,
      rowsArchived: 0,
      skipped: true,
      reason: 'No active users found for previous week',
    };
  }

  const scoreByUser = await getWeeklyScoresForUsers(allUserIds, weekStartIso, weekEndIso);

  const payload = allUserIds.map((userId) => {
    const activeDays = Number(scoreByUser.get(userId) || 0);
    const weeklyStars = getWeeklyStarsFromActiveDays(activeDays);
    const points = pointsByUserId.get(userId);

    return {
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      user_id: userId,
      active_days: activeDays,
      weekly_stars: weeklyStars,
      weekly_points_at_close: Number(points?.weekly || 0),
      monthly_points_at_close: Number(points?.monthly || 0),
      total_points_at_close: Number(points?.total || 0),
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabaseAdmin
    .from('weekly_star_snapshots')
    .upsert(payload as any[], { onConflict: 'week_start_date,user_id' });

  if (error) {
    if (error.code === '42P01') {
      return {
        weekStartDate,
        weekEndDate,
        usersConsidered: allUserIds.length,
        rowsArchived: 0,
        skipped: true,
        reason: 'weekly_star_snapshots table missing',
      };
    }
    throw error;
  }

  return {
    weekStartDate,
    weekEndDate,
    usersConsidered: allUserIds.length,
    rowsArchived: payload.length,
    skipped: false,
  };
}
