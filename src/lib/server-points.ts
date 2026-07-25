import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { POINTS_DAILY_CAP, resolveBasePoints, resolvePointsToAward } from '@/lib/points-policy';
import { shouldResetMonthlyPoints } from '@/lib/weekly-activity';
import { isTestModeUserId } from '@/lib/test-mode-server';
import { isPlaceholderSupabaseUrl, allowProductionSupabaseFallback } from '@/lib/supabase-public-config';

function supabaseUrlUnusable(): boolean {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  if (!isPlaceholderSupabaseUrl(url)) return false;
  return !allowProductionSupabaseFallback();
}

export type ServerAwardReason = 'awarded' | 'daily_limit_reached' | 'test_mode' | 'invalid_points' | 'update_failed';

export type ServerAwardPointsResult = {
  success: boolean;
  reason: ServerAwardReason;
  message: string;
  pointsAwarded: number;
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints: number;
  dailyLimit: number;
  badges: number;
  level: number;
  /** False when totals are unknown (early failure) — callers must not wipe the UI profile. */
  hasReliableTotals: boolean;
};

type ServerAwardOptions = {
  countTowardDailyLimit?: boolean;
  successMessage?: string;
  /** Skip the internal test-mode lookup when the caller already knows it (avoids an auth round trip). */
  knownIsTestMode?: boolean;
  /** Skip ensureUserRecords when the caller already ran it (avoids redundant reads/writes). */
  skipEnsureUserRecords?: boolean;
};

function emptyFailure(
  reason: ServerAwardReason,
  message: string,
  overrides: Partial<ServerAwardPointsResult> = {}
): ServerAwardPointsResult {
  return {
    success: false,
    reason,
    message,
    pointsAwarded: 0,
    totalPoints: 0,
    weeklyPoints: 0,
    monthlyPoints: 0,
    todayPoints: 0,
    dailyLimit: POINTS_DAILY_CAP,
    badges: 0,
    level: 1,
    hasReliableTotals: false,
    ...overrides,
  };
}

async function syncUsersTable(
  userId: string,
  totalPoints: number,
  weeklyPoints: number,
  monthlyPoints: number
): Promise<boolean> {
  const payload = {
    points: totalPoints,
    weeklypoints: weeklyPoints,
    monthlypoints: monthlyPoints,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(payload)
      .eq('uid', userId)
      .select('uid')
      .maybeSingle();

    if (!error && data?.uid) return true;

    // Update can "succeed" with 0 rows when the users row is missing — create it, then retry.
    if (!error && !data?.uid) {
      console.warn(`[server-points] users sync matched 0 rows for ${userId}; ensuring user row`);
      await ensureUserRecords(userId);
      continue;
    }

    console.error(`[server-points] users sync attempt ${attempt + 1} failed:`, error?.message);
  }
  return false;
}

export async function awardPointsWithDailyCapByUserId(
  userId: string,
  requestedPoints: number,
  options: ServerAwardOptions = {}
): Promise<ServerAwardPointsResult> {
  const countTowardDailyLimit = options.countTowardDailyLimit !== false;

  if (!requestedPoints || requestedPoints <= 0) {
    return emptyFailure('invalid_points', 'Points must be greater than 0.');
  }

  const isTestMode = options.knownIsTestMode ?? (await isTestModeUserId(userId));
  if (isTestMode) {
    return {
      success: true,
      reason: 'test_mode',
      message: 'Test mode active for this account. Mission bonus is tracked but no leaderboard points are added.',
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
      hasReliableTotals: false,
    };
  }

  if (supabaseUrlUnusable()) {
    return emptyFailure('update_failed', 'Supabase is not configured on this server. Points could not be saved.');
  }

  if (!options.skipEnsureUserRecords) {
    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return emptyFailure('update_failed', ensured.error || 'Could not prepare user profile for points.');
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const [pointsRowRes, userRowRes] = await Promise.all([
    supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('points, weeklypoints, monthlypoints')
      .eq('uid', userId)
      .maybeSingle(),
  ]);

  if (pointsRowRes.error) {
    return emptyFailure('update_failed', pointsRowRes.error.message);
  }

  if (userRowRes.error) {
    return emptyFailure('update_failed', userRowRes.error.message);
  }

  const existingRow = pointsRowRes.data;
  const userRow = userRowRes.data;

  // Prefer the higher of users_points vs users so a zero-seeded points row cannot wipe totals.
  const baseTotal = resolveBasePoints(existingRow?.total_points, userRow?.points);
  const baseWeekly = resolveBasePoints(existingRow?.weekly_points, userRow?.weeklypoints);
  let baseMonthly = resolveBasePoints(existingRow?.monthly_points, userRow?.monthlypoints);
  if (shouldResetMonthlyPoints(existingRow?.last_earned_date)) {
    baseMonthly = 0;
  }
  const isNewDay = !existingRow?.last_earned_date || existingRow.last_earned_date !== todayStr;
  const currentTodayPoints = isNewDay ? 0 : Number(existingRow?.today_points ?? 0);

  const pointsAwarded = resolvePointsToAward(
    requestedPoints,
    currentTodayPoints,
    countTowardDailyLimit
  );

  if (pointsAwarded <= 0) {
    const badges = Math.floor(baseTotal / 100);
    const level = 1 + Math.floor(badges / 5);
    const atDailyCap = countTowardDailyLimit && currentTodayPoints >= POINTS_DAILY_CAP;
    return {
      success: true,
      reason: 'daily_limit_reached',
      message: atDailyCap
        ? `You have already reached today's ${POINTS_DAILY_CAP} point limit.`
        : `No points could be added right now.`,
      pointsAwarded: 0,
      totalPoints: baseTotal,
      weeklyPoints: baseWeekly,
      monthlyPoints: baseMonthly,
      todayPoints: currentTodayPoints,
      dailyLimit: POINTS_DAILY_CAP,
      badges,
      level,
      hasReliableTotals: true,
    };
  }

  const totalPoints = baseTotal + pointsAwarded;
  const weeklyPoints = baseWeekly + pointsAwarded;
  const monthlyPoints = baseMonthly + pointsAwarded;
  // Uncapped awards (competitions, approvals) must not consume the daily earn budget.
  const todayPoints = countTowardDailyLimit ? currentTodayPoints + pointsAwarded : currentTodayPoints;
  const badges = Math.floor(totalPoints / 100);
  const level = 1 + Math.floor(badges / 5);

  const { error: upsertError } = await supabaseAdmin.from('users_points').upsert(
    {
      user_id: userId,
      total_points: totalPoints,
      weekly_points: weeklyPoints,
      monthly_points: monthlyPoints,
      today_points: todayPoints,
      last_earned_date: todayStr,
      badges,
      level,
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    return emptyFailure('update_failed', upsertError.message, {
      totalPoints: baseTotal,
      weeklyPoints: baseWeekly,
      monthlyPoints: baseMonthly,
      todayPoints: currentTodayPoints,
      badges: Math.floor(baseTotal / 100),
      level: 1 + Math.floor(Math.floor(baseTotal / 100) / 5),
      hasReliableTotals: true,
    });
  }

  const usersSynced = await syncUsersTable(userId, totalPoints, weeklyPoints, monthlyPoints);
  if (!usersSynced) {
    // users_points already has the new totals — keep returning them so the client updates.
    console.error('[server-points] users table sync failed after retries; users_points was updated');
  }

  return {
    success: true,
    reason: 'awarded',
    message: options.successMessage || `Mission bonus claimed. +${pointsAwarded} points added.`,
    pointsAwarded,
    totalPoints,
    weeklyPoints,
    monthlyPoints,
    todayPoints,
    dailyLimit: POINTS_DAILY_CAP,
    badges,
    level,
    hasReliableTotals: true,
  };
}
