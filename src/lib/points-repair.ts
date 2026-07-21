import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ACTIVITY_BONUS_POINTS,
  MAX_DAILY_DUROOD,
  MAX_DAILY_GAME_COMPLETIONS,
  MAX_DAILY_HADITH,
  MAX_DAILY_QUIZ_ATTEMPTS,
  MAX_DAILY_SALAH,
  MAX_DAILY_ZIKR,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
} from '@/lib/points-policy';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { countGameEarningSessions } from '@/lib/daily-activity-limits';

export type TodayActivitySummary = {
  quizCompletions: number;
  gameSessions: number;
  pledgeSubmissions: number;
  rawPoints: number;
  cappedTodayPoints: number;
};

export function getUtcDayBounds(date = new Date()) {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return {
    dayStartIso: dayStart.toISOString(),
    dayEndIso: dayEnd.toISOString(),
    dayKey: dayStart.toISOString().slice(0, 10),
  };
}

export async function summarizeTodayActivity(userId: string): Promise<TodayActivitySummary> {
  const { dayStartIso, dayEndIso } = getUtcDayBounds();

  const [quizRes, gamesRes, duroodRes, zikrRes, hadithRes, salahRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('score, max_score, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', dayStartIso)
      .lt('completed_at', dayEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('gameid, points, playedat')
      .eq('uid', userId)
      .gte('playedat', dayStartIso)
      .lt('playedat', dayEndIso),
    supabaseAdmin
      .from('pledges')
      .select('count, type, created_at')
      .eq('user_id', userId)
      .eq('type', 'durood')
      .gte('created_at', dayStartIso)
      .lt('created_at', dayEndIso),
    supabaseAdmin
      .from('pledges')
      .select('count, type, created_at')
      .eq('user_id', userId)
      .eq('type', 'zikr')
      .gte('created_at', dayStartIso)
      .lt('created_at', dayEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('gameid, points')
      .eq('uid', userId)
      .eq('gameid', 'activity-hadith')
      .gt('points', 0)
      .gte('playedat', dayStartIso)
      .lt('playedat', dayEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('gameid, points')
      .eq('uid', userId)
      .eq('gameid', 'activity-salah')
      .gt('points', 0)
      .gte('playedat', dayStartIso)
      .lt('playedat', dayEndIso),
  ]);

  let quizCompletions = 0;
  for (const row of quizRes.data || []) {
    const score = Number((row as any).score ?? 0);
    const maxScore = Number((row as any).max_score ?? 0);
    if (maxScore > 0 && score >= maxScore) quizCompletions += 1;
  }

  const gameSessions = countGameEarningSessions(gamesRes.data || []);
  const duroodSubmissions = (duroodRes.data || []).filter(
    (row: any) => Number(row.count ?? 0) >= 5
  ).length;
  const zikrSubmissions = (zikrRes.data || []).filter(
    (row: any) => Number(row.count ?? 0) >= 5
  ).length;
  const hadithSessions = (hadithRes.data || []).length;
  const salahSessions = (salahRes.data || []).length;

  const rawPoints =
    Math.min(quizCompletions, MAX_DAILY_QUIZ_ATTEMPTS) * QUIZ_POINTS_PER_COMPLETION +
    Math.min(gameSessions, MAX_DAILY_GAME_COMPLETIONS) * ACTIVITY_BONUS_POINTS +
    Math.min(duroodSubmissions, MAX_DAILY_DUROOD) * ACTIVITY_BONUS_POINTS +
    Math.min(zikrSubmissions, MAX_DAILY_ZIKR) * ACTIVITY_BONUS_POINTS +
    Math.min(hadithSessions, MAX_DAILY_HADITH) * ACTIVITY_BONUS_POINTS +
    Math.min(salahSessions, MAX_DAILY_SALAH) * ACTIVITY_BONUS_POINTS;

  return {
    quizCompletions,
    gameSessions,
    pledgeSubmissions: duroodSubmissions + zikrSubmissions,
    rawPoints,
    cappedTodayPoints: Math.min(POINTS_DAILY_CAP, rawPoints),
  };
}

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('uid')
    .ilike('email', target)
    .maybeSingle();

  if (profile?.uid) return String(profile.uid);

  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((u) => String(u.email || '').trim().toLowerCase() === target);
    if (match?.id) return String(match.id);
    if (users.length < 1000) break;
    page += 1;
  }

  return null;
}

export async function repairUserPointsByUserId(userId: string, options?: { backfillToday?: boolean }) {
  const backfillToday = options?.backfillToday !== false;
  const ensured = await ensureUserRecords(userId);
  if (!ensured.ok) {
    throw new Error(ensured.error || 'Could not ensure user records.');
  }

  const { data: beforeRow, error: readErr } = await supabaseAdmin
    .from('users_points')
    .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
    .eq('user_id', userId)
    .maybeSingle();

  if (readErr) throw readErr;

  const todaySummary = await summarizeTodayActivity(userId);
  const { dayKey } = getUtcDayBounds();
  const lastEarned = String(beforeRow?.last_earned_date || '');
  const recordedToday =
    lastEarned === dayKey ? Number(beforeRow?.today_points ?? 0) : 0;
  const missingToday = backfillToday
    ? Math.max(0, todaySummary.cappedTodayPoints - recordedToday)
    : 0;

  let afterRow = beforeRow;
  if (missingToday > 0) {
    const baseTotal = Number(beforeRow?.total_points ?? 0);
    const baseWeekly = Number(beforeRow?.weekly_points ?? 0);
    const baseMonthly = Number(beforeRow?.monthly_points ?? 0);
    const totalPoints = baseTotal + missingToday;
    const weeklyPoints = baseWeekly + missingToday;
    const monthlyPoints = baseMonthly + missingToday;
    const todayPoints = recordedToday + missingToday;
    const badges = Math.floor(totalPoints / 100);
    const level = 1 + Math.floor(badges / 5);

    const { error: updateErr } = await supabaseAdmin
      .from('users_points')
      .upsert(
        {
          user_id: userId,
          total_points: totalPoints,
          weekly_points: weeklyPoints,
          monthly_points: monthlyPoints,
          today_points: todayPoints,
          last_earned_date: dayKey,
          badges,
          level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateErr) throw updateErr;

    await supabaseAdmin
      .from('users')
      .update({
        points: totalPoints,
        weeklypoints: weeklyPoints,
        monthlypoints: monthlyPoints,
      })
      .eq('uid', userId);

    afterRow = {
      total_points: totalPoints,
      weekly_points: weeklyPoints,
      monthly_points: monthlyPoints,
      today_points: todayPoints,
      last_earned_date: dayKey,
      badges,
      level,
    };
  }

  return {
    userId,
    ensured,
    todaySummary,
    recordedToday,
    missingTodayApplied: missingToday,
    before: beforeRow,
    after: afterRow,
  };
}

export async function repairUserPointsByEmail(email: string, options?: { backfillToday?: boolean }) {
  const userId = await findAuthUserIdByEmail(email);
  if (!userId) {
    throw new Error(`No auth user found for email: ${email}`);
  }
  return repairUserPointsByUserId(userId, options);
}
