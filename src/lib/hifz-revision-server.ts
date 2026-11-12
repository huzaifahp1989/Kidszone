import { supabaseAdmin } from '@/lib/supabase-admin';
import { isMissingTableError } from '@/lib/challenge-quiz-server';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { HIFZ_SURAH_LIST } from '@/data/hifz-surahs';
import {
  addDays,
  computeDueItems,
  nextIntervalDays,
  planRevision,
  summariseSchedule,
  type HifzRevisionRow,
  type RevisionStatus,
  type ScheduleSummary,
} from '@/lib/hifz-revision-core';

export const HIFZ_REVISION_TABLE = 'hifz_revision_schedule';

/** Small reward for a successful revision (kept tiny; the daily cap still applies). */
export const REVISION_POINTS = 5;

export { isMissingTableError };

export type RevisionOverview = {
  available: boolean;
  rows: HifzRevisionRow[];
  due: HifzRevisionRow[];
  summary: ScheduleSummary;
};

export type RevisionProfile = {
  points: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints: number;
};

export type CompleteRevisionResult =
  | { available: false }
  | { available: true; row: HifzRevisionRow; pointsAwarded: number; profile?: RevisionProfile };

export type SyncResult = {
  available: boolean;
  inserted: number;
  rows: HifzRevisionRow[];
};

const SELECT_COLUMNS =
  'surah_number, status, interval_days, streak, last_reviewed_at, due_at, review_count';

function mapRow(row: Record<string, unknown>): HifzRevisionRow {
  const status = String(row.status || 'scheduled') as RevisionStatus;
  return {
    surah_number: Number(row.surah_number),
    status,
    interval_days: Number(row.interval_days ?? 1),
    streak: Number(row.streak ?? 0),
    last_reviewed_at: row.last_reviewed_at ? String(row.last_reviewed_at) : null,
    due_at: String(row.due_at),
    review_count: Number(row.review_count ?? 0),
  };
}

function emptySummary(): ScheduleSummary {
  return { dueCount: 0, scheduledCount: 0, completedToday: 0, nextDueAt: null };
}

/**
 * Read every revision row for a user. Returns `available: false` when the table
 * has not been created yet so the UI can hide the card instead of crashing.
 */
export async function getRevisionSchedule(
  userId: string
): Promise<{ available: boolean; rows: HifzRevisionRow[] }> {
  const { data, error } = await supabaseAdmin
    .from(HIFZ_REVISION_TABLE)
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .order('due_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return { available: false, rows: [] };
    throw error;
  }

  return {
    available: true,
    rows: (data || []).map((row) => mapRow(row as Record<string, unknown>)),
  };
}

/** Schedule + due queue + summary in one read. */
export async function getDueRevisions(
  userId: string,
  now: Date = new Date()
): Promise<RevisionOverview> {
  const schedule = await getRevisionSchedule(userId);
  if (!schedule.available) {
    return { available: false, rows: [], due: [], summary: emptySummary() };
  }
  return {
    available: true,
    rows: schedule.rows,
    due: computeDueItems(schedule.rows, now),
    summary: summariseSchedule(schedule.rows, now),
  };
}

/**
 * Record a revision for a surah. Advances the interval on success, resets it on
 * failure, and awards a small points bonus for a successful recall.
 */
export async function completeRevision(args: {
  userId: string;
  surahNumber: number;
  remembered: boolean;
  now?: Date;
}): Promise<CompleteRevisionResult> {
  const { userId, surahNumber, remembered } = args;
  const now = args.now ?? new Date();

  const existingRes = await supabaseAdmin
    .from(HIFZ_REVISION_TABLE)
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .eq('surah_number', surahNumber)
    .maybeSingle();

  if (existingRes.error) {
    if (isMissingTableError(existingRes.error)) return { available: false };
    throw existingRes.error;
  }

  const prev = existingRes.data;
  const prevStreak = Number(prev?.streak ?? 0);
  const prevReviewCount = Number(prev?.review_count ?? 0);
  const newStreak = remembered ? prevStreak + 1 : 0;
  const intervalDays = nextIntervalDays(newStreak, remembered);

  const upsertRes = await supabaseAdmin
    .from(HIFZ_REVISION_TABLE)
    .upsert(
      {
        user_id: userId,
        surah_number: surahNumber,
        status: remembered ? 'completed' : 'scheduled',
        interval_days: intervalDays,
        streak: newStreak,
        last_reviewed_at: now.toISOString(),
        due_at: addDays(now, intervalDays),
        review_count: prevReviewCount + 1,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id,surah_number' }
    )
    .select(SELECT_COLUMNS)
    .single();

  if (upsertRes.error) {
    if (isMissingTableError(upsertRes.error)) return { available: false };
    throw upsertRes.error;
  }

  const row = mapRow(upsertRes.data as Record<string, unknown>);

  let pointsAwarded = 0;
  let profile: RevisionProfile | undefined;
  if (remembered) {
    const award = await awardPointsWithDailyCapByUserId(userId, REVISION_POINTS, {
      successMessage: '✅ Revision logged!',
    });
    pointsAwarded = award.pointsAwarded;
    if (award.hasReliableTotals) {
      profile = {
        points: award.totalPoints,
        weeklyPoints: award.weeklyPoints,
        monthlyPoints: award.monthlyPoints,
        todayPoints: award.todayPoints,
      };
    }
  }

  return { available: true, row, pointsAwarded, profile };
}

/**
 * Ensure a revision row exists for every surah the user has marked memorised.
 * Brand-new rows are due immediately so they show up in today's queue.
 */
export async function syncMemorisedSurahs(
  userId: string,
  now: Date = new Date()
): Promise<SyncResult> {
  let memorised: number[] = [];
  const progressRes = await supabaseAdmin
    .from('hifz_progress')
    .select('surah_number')
    .eq('user_id', userId)
    .eq('status', 'memorized');

  if (!progressRes.error && Array.isArray(progressRes.data)) {
    memorised = progressRes.data
      .map((row) => Number((row as Record<string, unknown>).surah_number))
      .filter((n) => Number.isFinite(n));
  }

  const schedule = await getRevisionSchedule(userId);
  if (!schedule.available) return { available: false, inserted: 0, rows: [] };

  const planned = planRevision(schedule.rows, memorised, now);
  if (planned.length > 0) {
    const insertRes = await supabaseAdmin
      .from(HIFZ_REVISION_TABLE)
      .upsert(
        planned.map((item) => ({ ...item, user_id: userId })),
        { onConflict: 'user_id,surah_number', ignoreDuplicates: true }
      );

    if (insertRes.error) {
      if (isMissingTableError(insertRes.error)) return { available: false, inserted: 0, rows: [] };
      throw insertRes.error;
    }
  }

  const refreshed = await getRevisionSchedule(userId);
  return { available: refreshed.available, inserted: planned.length, rows: refreshed.rows };
}

/** True when a surah number exists in the Hifz curriculum (used to validate input). */
export function isKnownHifzSurah(surahNumber: number): boolean {
  return HIFZ_SURAH_LIST.some((surah) => surah.number === surahNumber);
}
