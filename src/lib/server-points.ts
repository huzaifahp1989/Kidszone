import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { POINTS_DAILY_CAP, resolveBasePoints, resolvePointsToAward } from '@/lib/points-policy';
import { shouldResetMonthlyPoints } from '@/lib/weekly-activity';
import { isTestModeUserId } from '@/lib/test-mode-server';
import { isPlaceholderSupabaseUrl as isPlaceholderUrl } from '@/lib/supabase-public-config';

function supabaseUrlUnusable(): boolean {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  if (!isPlaceholderUrl(url)) return false;
  // Match supabase-admin: production/Vercel builds fall back to the known project.
  const allowProductionFallback = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
  return !allowProductionFallback;
}

async function syncUsersPointsMirror(
  userId: string,
  totals: { totalPoints: number; weeklyPoints: number; monthlyPoints: number }
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    points: totals.totalPoints,
    weeklypoints: totals.weeklyPoints,
    monthlypoints: totals.monthlyPoints,
  };

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(payload)
    .eq('uid', userId)
    .select('uid');

  if (error) {
    return { ok: false, error: error.message };
  }

  if (Array.isArray(data) && data.length > 0) {
    return { ok: true };
  }

  // Update matched 0 rows — ensure the users row exists, then write again.
  const ensured = await ensureUserRecords(userId);
  if (!ensured.ok) {
    return { ok: false, error: ensured.error || 'Could not ensure users row for points mirror.' };
  }

  const { data: retryData, error: retryError } = await supabaseAdmin
    .from('users')
    .update(payload)
    .eq('uid', userId)
    .select('uid');

  if (retryError) {
    return { ok: false, error: retryError.message };
  }

  if (!Array.isArray(retryData) || retryData.length === 0) {
    return { ok: false, error: 'users row still missing after ensureUserRecords.' };
  }

  return { ok: true };
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
};

type ServerAwardOptions = {
  countTowardDailyLimit?: boolean;
  successMessage?: string;
  /** Skip the internal test-mode lookup when the caller already knows it (avoids an auth round trip). */
  knownIsTestMode?: boolean;
  /** Skip ensureUserRecords when the caller already ran it (avoids redundant reads/writes). */
  skipEnsureUserRecords?: boolean;
};

export async function awardPointsWithDailyCapByUserId(
  userId: string,
  requestedPoints: number,
  options: ServerAwardOptions = {}
): Promise<ServerAwardPointsResult> {
  const countTowardDailyLimit = options.countTowardDailyLimit !== false;

  if (!requestedPoints || requestedPoints <= 0) {
    return {
      success: false,
      reason: 'invalid_points',
      message: 'Points must be greater than 0.',
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
    };
  }

  if (supabaseUrlUnusable()) {
    return {
      success: false,
      reason: 'update_failed',
      message:
        'Supabase is not configured on this deployment (placeholder URL). Set NEXT_PUBLIC_SUPABASE_URL and related keys in Vercel.',
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
    };
  }

  if (!hasSupabaseServiceRole()) {
    return {
      success: false,
      reason: 'update_failed',
      message:
        'SUPABASE_SERVICE_ROLE_KEY is missing — point awards cannot bypass RLS. Set the service_role key in Vercel.',
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
    };
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
    };
  }

  if (!options.skipEnsureUserRecords) {
    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return {
        success: false,
        reason: 'update_failed',
        message: ensured.error || 'Could not prepare user profile for points.',
        pointsAwarded: 0,
        totalPoints: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        todayPoints: 0,
        dailyLimit: POINTS_DAILY_CAP,
        badges: 0,
        level: 1,
      };
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
    return {
      success: false,
      reason: 'update_failed',
      message: pointsRowRes.error.message,
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
    };
  }

  if (userRowRes.error) {
    return {
      success: false,
      reason: 'update_failed',
      message: userRowRes.error.message,
      pointsAwarded: 0,
      totalPoints: 0,
      weeklyPoints: 0,
      monthlyPoints: 0,
      todayPoints: 0,
      dailyLimit: POINTS_DAILY_CAP,
      badges: 0,
      level: 1,
    };
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
    };
  }

  const totalPoints = baseTotal + pointsAwarded;
  const weeklyPoints = baseWeekly + pointsAwarded;
  const monthlyPoints = baseMonthly + pointsAwarded;
  const todayPoints = countTowardDailyLimit ? currentTodayPoints + pointsAwarded : currentTodayPoints;
  const badges = Math.floor(totalPoints / 100);
  const level = 1 + Math.floor(badges / 5);

  const { error: upsertError } = await supabaseAdmin
    .from('users_points')
    .upsert({
      user_id: userId,
      total_points: totalPoints,
      weekly_points: weeklyPoints,
      monthly_points: monthlyPoints,
      today_points: todayPoints,
      last_earned_date: todayStr,
      badges,
      level,
    }, { onConflict: 'user_id' });

  if (upsertError) {
    return {
      success: false,
      reason: 'update_failed',
      message: upsertError.message,
      pointsAwarded: 0,
      totalPoints: baseTotal,
      weeklyPoints: baseWeekly,
      monthlyPoints: baseMonthly,
      todayPoints: currentTodayPoints,
      dailyLimit: POINTS_DAILY_CAP,
      badges: Math.floor(baseTotal / 100),
      level: 1 + Math.floor(Math.floor(baseTotal / 100) / 5),
    };
  }

  const sync = await syncUsersPointsMirror(userId, {
    totalPoints,
    weeklyPoints,
    monthlyPoints,
  });

  if (!sync.ok) {
    console.error('[server-points] users sync failed (retrying once):', sync.error);
    const retry = await syncUsersPointsMirror(userId, {
      totalPoints,
      weeklyPoints,
      monthlyPoints,
    });
    if (!retry.ok) {
      console.error('[server-points] users sync retry failed:', retry.error);
      // users_points already has the new total — still report success for the award,
      // but surface the mirror failure in the message for ops/debug.
      return {
        success: true,
        reason: 'awarded',
        message:
          (options.successMessage || `+${pointsAwarded} points added.`) +
          ' (Profile mirror sync lagged — refresh if totals look stale.)',
        pointsAwarded,
        totalPoints,
        weeklyPoints,
        monthlyPoints,
        todayPoints,
        dailyLimit: POINTS_DAILY_CAP,
        badges,
        level,
      };
    }
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
  };
}
