import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getMonthStartUtc,
  getPreviousMonthStartUtc,
  getQuarterKey,
  isEligibleForMonthlyStar,
} from '@/lib/leaderboard-rules';
import { syncUserPointsMirror } from '@/lib/server-points';

export type MonthlyResetSummary = {
  usersScanned: number;
  snapshotsWritten: number;
  starsGranted: number;
  monthlyZeroed: number;
  errors: string[];
};

type PointsRow = {
  user_id: string;
  monthly_points: number | null;
  total_points: number | null;
  weekly_points: number | null;
  stars_this_quarter: number | null;
  quarter_key: string | null;
};

/**
 * Snapshot ending monthly points into user_monthly_progress, grant stars, then zero monthly counters.
 * @param options.closingMonthStart - YYYY-MM-01 of the month being closed. Defaults to previous month (cron on 1st).
 */
export async function snapshotAndResetMonthlyPoints(options?: {
  closingMonthStart?: string;
}): Promise<MonthlyResetSummary> {
  const closingMonthStart =
    options?.closingMonthStart || getPreviousMonthStartUtc().toISOString().slice(0, 10);
  const closingDate = new Date(`${closingMonthStart}T12:00:00.000Z`);
  const quarterKeyForClosedMonth = getQuarterKey(closingDate);
  const nowIso = new Date().toISOString();

  const summary: MonthlyResetSummary = {
    usersScanned: 0,
    snapshotsWritten: 0,
    starsGranted: 0,
    monthlyZeroed: 0,
    errors: [],
  };

  const { data: rows, error } = await supabaseAdmin
    .from('users_points')
    .select('user_id, monthly_points, total_points, weekly_points, stars_this_quarter, quarter_key')
    .gt('monthly_points', -1);

  if (error) {
    // stars_this_quarter may not exist yet — fall back without rollup columns
    const fallback = await supabaseAdmin
      .from('users_points')
      .select('user_id, monthly_points, total_points, weekly_points')
      .gt('monthly_points', -1);
    if (fallback.error) throw fallback.error;
    return snapshotRows(
      (fallback.data || []).map((r) => ({
        ...r,
        stars_this_quarter: 0,
        quarter_key: null,
      })) as PointsRow[],
      closingMonthStart,
      quarterKeyForClosedMonth,
      nowIso,
      summary
    );
  }

  return snapshotRows(
    (rows || []) as PointsRow[],
    closingMonthStart,
    quarterKeyForClosedMonth,
    nowIso,
    summary
  );
}

async function snapshotRows(
  rows: PointsRow[],
  closingMonthStart: string,
  quarterKeyForClosedMonth: string,
  nowIso: string,
  summary: MonthlyResetSummary
): Promise<MonthlyResetSummary> {
  summary.usersScanned = rows.length;

  for (const row of rows) {
    const userId = String(row.user_id);
    const monthlyPoints = Number(row.monthly_points || 0);

    try {
      if (monthlyPoints > 0) {
        const starEarned = isEligibleForMonthlyStar(monthlyPoints);
        const { data: existing } = await supabaseAdmin
          .from('user_monthly_progress')
          .select('total_points, total_activities, quiz_attempts, pledge_logs, game_sessions, points_from_quiz, points_from_games')
          .eq('user_id', userId)
          .eq('month_start', closingMonthStart)
          .maybeSingle();

        const upsertPayload: Record<string, unknown> = {
          user_id: userId,
          month_start: closingMonthStart,
          leaderboard_monthly_points: monthlyPoints,
          star_earned: starEarned,
          star_awarded_at: starEarned ? nowIso : null,
          updated_at: nowIso,
          // Prefer existing reconstructed totals; otherwise seed from leaderboard monthly
          total_points: Number(existing?.total_points || 0) > 0
            ? Number(existing?.total_points || 0)
            : monthlyPoints,
        };

        const { error: snapErr } = await supabaseAdmin
          .from('user_monthly_progress')
          .upsert(upsertPayload, { onConflict: 'user_id,month_start' });

        if (snapErr) {
          summary.errors.push(`${userId}: snapshot ${snapErr.message}`);
        } else {
          summary.snapshotsWritten += 1;
        }

        if (starEarned) {
          summary.starsGranted += 1;
          const prevQuarter = String(row.quarter_key || '');
          const prevStars = Number(row.stars_this_quarter || 0);
          const nextStars =
            prevQuarter === quarterKeyForClosedMonth ? Math.min(3, prevStars + 1) : 1;

          await supabaseAdmin
            .from('users_points')
            .update({
              stars_this_quarter: nextStars,
              quarter_key: quarterKeyForClosedMonth,
            } as any)
            .eq('user_id', userId);
        }
      }

      if (monthlyPoints !== 0) {
        const { error: zeroErr } = await supabaseAdmin
          .from('users_points')
          .update({ monthly_points: 0, updated_at: nowIso } as any)
          .eq('user_id', userId);

        if (zeroErr) {
          summary.errors.push(`${userId}: zero ${zeroErr.message}`);
        } else {
          summary.monthlyZeroed += 1;
          await supabaseAdmin
            .from('users')
            .update({ monthlypoints: 0 } as any)
            .eq('uid', userId);
        }
      }
    } catch (e: any) {
      summary.errors.push(`${userId}: ${e?.message || 'unknown'}`);
    }
  }

  // Also clear any users.monthlypoints that might still be non-zero without a users_points row
  await supabaseAdmin.from('users').update({ monthlypoints: 0 } as any).neq('monthlypoints', 0);

  return summary;
}

/** Admin mid-month reset: close the current calendar month. */
export async function snapshotAndResetCurrentMonth(): Promise<MonthlyResetSummary> {
  return snapshotAndResetMonthlyPoints({ closingMonthStart: getMonthStartUtc().toISOString().slice(0, 10) });
}

export async function createPrizeWinRecord(input: {
  userId?: string | null;
  periodType: 'weekly' | 'monthly' | 'quarterly';
  periodKey: string;
  displayName: string;
  notes?: string | null;
  createdBy?: string | null;
  starsAtWin?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  let pointsAtWin = 0;
  let weeklyAtWin = 0;
  let monthlyAtWin = 0;
  let starsAtWin = Number(input.starsAtWin || 0);

  if (input.userId) {
    const { data } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, stars_this_quarter')
      .eq('user_id', input.userId)
      .maybeSingle();
    pointsAtWin = Number(data?.total_points || 0);
    weeklyAtWin = Number(data?.weekly_points || 0);
    monthlyAtWin = Number(data?.monthly_points || 0);
    if (!starsAtWin) starsAtWin = Number((data as any)?.stars_this_quarter || 0);
  }

  const { data, error } = await supabaseAdmin
    .from('prize_win_records')
    .insert({
      user_id: input.userId || null,
      period_type: input.periodType,
      period_key: input.periodKey,
      display_name: input.displayName,
      points_at_win: pointsAtWin,
      weekly_points_at_win: weeklyAtWin,
      monthly_points_at_win: monthlyAtWin,
      stars_at_win: starsAtWin,
      notes: input.notes || null,
      created_by: input.createdBy || null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42P01' || /prize_win_records/i.test(error.message)) {
      return { ok: false, error: 'prize_win_records table missing — run migration SQL' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}

export async function resolveUserIdByDisplayName(name: string): Promise<string | null> {
  const target = String(name || '').trim();
  if (!target) return null;
  const { data } = await supabaseAdmin
    .from('users')
    .select('uid, name')
    .ilike('name', target)
    .limit(5);
  if (!data?.length) return null;
  const exact = data.find((u) => String(u.name || '').trim().toLowerCase() === target.toLowerCase());
  return String((exact || data[0]).uid);
}

/** Re-sync mirror for a single user after repair. */
export async function ensureMirrorSynced(userId: string) {
  return syncUserPointsMirror(userId);
}
