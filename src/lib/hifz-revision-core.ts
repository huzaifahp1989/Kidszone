/**
 * Pure logic for the Hifz revision scheduler (spaced repetition).
 *
 * Deliberately free of Supabase/React imports so it can be unit tested directly.
 * All timestamps are ISO strings; `now` is injectable for deterministic tests.
 *
 * Model: each memorised surah has one row in `hifz_revision_schedule`. A row is
 * "due" when `due_at <= now` (or its status is explicitly `'due'`). On a
 * successful revision the interval advances along SPACED_INTERVALS_DAYS; a
 * failed revision ("needs practice") resets the interval to the first step.
 */

/** Leitner-style interval ladder in days. Index 0 is a brand-new item. */
export const SPACED_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60] as const;

/** Fallback retention for brand-new items — they are due immediately so kids can revise today. */
export const DEFAULT_RETENTION_DAYS = SPACED_INTERVALS_DAYS[0];

export const REVISION_STATUSES = ['scheduled', 'due', 'completed', 'snoozed'] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

/** The subset of a `hifz_revision_schedule` row the scheduling logic needs. */
export type HifzRevisionRow = {
  surah_number: number;
  status: RevisionStatus;
  interval_days: number;
  streak: number;
  last_reviewed_at: string | null;
  due_at: string;
  review_count: number;
};

/** A row (without user_id) to be inserted when syncing memorised surahs. */
export type PlannedRevision = Omit<HifzRevisionRow, 'status'> & { status: RevisionStatus };

export type ScheduleSummary = {
  dueCount: number;
  scheduledCount: number;
  completedToday: number;
  nextDueAt: string | null;
};

const MS_PER_DAY = 86_400_000;

/**
 * Interval (in days) to schedule next.
 *
 * @param streak     consecutive successful revisions *after* this one (0 = fresh).
 * @param remembered whether the learner recalled the surah on this revision.
 * On failure the interval resets to the first step (1 day). On success it
 * advances along the ladder and caps at the longest interval.
 */
export function nextIntervalDays(streak: number, remembered: boolean): number {
  if (!remembered) return SPACED_INTERVALS_DAYS[0];
  const safeStreak = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  const index = Math.min(safeStreak, SPACED_INTERVALS_DAYS.length - 1);
  return SPACED_INTERVALS_DAYS[index];
}

function isDue(row: HifzRevisionRow, nowMs: number): boolean {
  if (row.status === 'due') return true;
  const dueMs = Date.parse(row.due_at);
  return Number.isFinite(dueMs) && dueMs <= nowMs;
}

/** Rows that are due for revision right now, ordered by due date then surah number. */
export function computeDueItems(
  rows: readonly HifzRevisionRow[],
  now: Date = new Date()
): HifzRevisionRow[] {
  const nowMs = now.getTime();
  return rows
    .filter((row) => isDue(row, nowMs))
    .sort((a, b) => {
      const aMs = Date.parse(a.due_at);
      const bMs = Date.parse(b.due_at);
      const aValid = Number.isFinite(aMs);
      const bValid = Number.isFinite(bMs);
      if (aValid && bValid && aMs !== bMs) return aMs - bMs;
      return a.surah_number - b.surah_number;
    });
}

/**
 * Decide which revision rows to create when surahs are marked memorised.
 * Skips surahs that already have a row and de-duplicates the input. Brand-new
 * items are due immediately (DEFAULT_RETENTION_DAYS) with an empty streak.
 */
export function planRevision(
  rows: readonly HifzRevisionRow[],
  surahNumbers: readonly number[],
  now: Date = new Date()
): PlannedRevision[] {
  const existing = new Set(rows.map((row) => row.surah_number));
  const seen = new Set<number>();
  const planned: PlannedRevision[] = [];

  for (const raw of surahNumbers) {
    const surahNumber = Number(raw);
    if (!Number.isFinite(surahNumber)) continue;
    if (existing.has(surahNumber) || seen.has(surahNumber)) continue;
    seen.add(surahNumber);
    planned.push({
      surah_number: surahNumber,
      status: 'due',
      interval_days: DEFAULT_RETENTION_DAYS,
      streak: 0,
      last_reviewed_at: null,
      due_at: now.toISOString(),
      review_count: 0,
    });
  }

  return planned;
}

/** A compact snapshot of the schedule for the UI header. */
export function summariseSchedule(
  rows: readonly HifzRevisionRow[],
  now: Date = new Date()
): ScheduleSummary {
  const nowMs = now.getTime();
  const due = computeDueItems(rows, now);
  const dueNumbers = new Set(due.map((row) => row.surah_number));

  let scheduledCount = 0;
  let nextDueMs = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    if (dueNumbers.has(row.surah_number)) continue;
    const dueMs = Date.parse(row.due_at);
    if (Number.isFinite(dueMs) && dueMs > nowMs) {
      scheduledCount += 1;
      if (dueMs < nextDueMs) nextDueMs = dueMs;
    }
  }

  const todayKey = now.toISOString().slice(0, 10);
  const completedToday = rows.filter(
    (row) =>
      row.status === 'completed' &&
      typeof row.last_reviewed_at === 'string' &&
      row.last_reviewed_at.slice(0, 10) === todayKey
  ).length;

  return {
    dueCount: due.length,
    scheduledCount,
    completedToday,
    nextDueAt: nextDueMs === Number.POSITIVE_INFINITY ? null : new Date(nextDueMs).toISOString(),
  };
}

/** ISO timestamp `days` calendar days after `from`. */
export function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * MS_PER_DAY).toISOString();
}
