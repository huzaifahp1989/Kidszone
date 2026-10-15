import { supabaseAdmin } from '@/lib/supabase-admin';
import { isGameEarningSessionRow } from '@/lib/daily-activity-limits';
import {
  ACTIVITY_BONUS_POINTS,
  MAX_DAILY_DUROOD,
  MAX_DAILY_GAME_COMPLETIONS,
  MAX_DAILY_HADITH,
  MAX_DAILY_QUIZ_ATTEMPTS,
  MAX_DAILY_SALAH,
  MAX_DAILY_STORY_QUIZ,
  MAX_DAILY_ZIKR,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
} from '@/lib/points-policy';

export type DayPointsCell = {
  date: string;
  points: number;
  estimated: boolean;
  isToday: boolean;
};

export type MonthPointsRow = {
  key: string;
  label: string;
  points: number;
  isCurrent: boolean;
  source: 'live' | 'snapshot' | 'estimated';
};

function utcDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function daysInUtcMonth(year: number, month: number): string[] {
  const keys: string[] = [];
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function emptyDayBucket() {
  return {
    quizCompletions: 0,
    gameSessions: 0,
    durood: 0,
    zikr: 0,
    hadith: 0,
    salah: 0,
    storyQuiz: 0,
  };
}

type DayBucket = ReturnType<typeof emptyDayBucket>;

function pointsFromBucket(b: DayBucket): number {
  const raw =
    Math.min(b.quizCompletions, MAX_DAILY_QUIZ_ATTEMPTS) * QUIZ_POINTS_PER_COMPLETION +
    Math.min(b.gameSessions, MAX_DAILY_GAME_COMPLETIONS) * ACTIVITY_BONUS_POINTS +
    Math.min(b.durood, MAX_DAILY_DUROOD) * ACTIVITY_BONUS_POINTS +
    Math.min(b.zikr, MAX_DAILY_ZIKR) * ACTIVITY_BONUS_POINTS +
    Math.min(b.hadith, MAX_DAILY_HADITH) * ACTIVITY_BONUS_POINTS +
    Math.min(b.salah, MAX_DAILY_SALAH) * ACTIVITY_BONUS_POINTS +
    Math.min(b.storyQuiz, MAX_DAILY_STORY_QUIZ) * ACTIVITY_BONUS_POINTS;
  return Math.min(POINTS_DAILY_CAP, raw);
}

/** Reconstruct capped daily points from activity tables for a UTC month. */
export async function estimateDailyPointsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<Map<string, number>> {
  const dayKeys = daysInUtcMonth(year, month);
  const startIso = `${dayKeys[0]}T00:00:00.000Z`;
  const endExclusive = new Date(Date.UTC(year, month, 1)).toISOString();
  const buckets = new Map<string, DayBucket>();
  for (const key of dayKeys) buckets.set(key, emptyDayBucket());

  const [quizRes, gamesRes, pledgesRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('score, max_score, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', startIso)
      .lt('completed_at', endExclusive),
    supabaseAdmin
      .from('game_progress')
      .select('gameid, points, playedat')
      .eq('uid', userId)
      .gte('playedat', startIso)
      .lt('playedat', endExclusive),
    supabaseAdmin
      .from('pledges')
      .select('count, type, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endExclusive),
  ]);

  for (const row of quizRes.data || []) {
    const key = utcDateKey(String((row as { completed_at?: string }).completed_at || ''));
    const bucket = key ? buckets.get(key) : undefined;
    if (!bucket) continue;
    const score = Number((row as { score?: number }).score ?? 0);
    const maxScore = Number((row as { max_score?: number }).max_score ?? 0);
    if (maxScore > 0 && score >= maxScore) bucket.quizCompletions += 1;
  }

  for (const row of gamesRes.data || []) {
    const key = utcDateKey(String((row as { playedat?: string }).playedat || ''));
    const bucket = key ? buckets.get(key) : undefined;
    if (!bucket) continue;
    const gameId = String((row as { gameid?: string }).gameid || '');
    if (gameId === 'activity-hadith' && Number((row as { points?: number }).points || 0) > 0) {
      bucket.hadith += 1;
      continue;
    }
    if (gameId === 'activity-salah' && Number((row as { points?: number }).points || 0) > 0) {
      bucket.salah += 1;
      continue;
    }
    if (gameId === 'activity-story-quiz' && Number((row as { points?: number }).points || 0) > 0) {
      bucket.storyQuiz += 1;
      continue;
    }
    if (isGameEarningSessionRow(row)) bucket.gameSessions += 1;
  }

  for (const row of pledgesRes.data || []) {
    const key = utcDateKey(String((row as { created_at?: string }).created_at || ''));
    const bucket = key ? buckets.get(key) : undefined;
    if (!bucket) continue;
    if (Number((row as { count?: number }).count ?? 0) < 5) continue;
    const type = String((row as { type?: string }).type || '');
    if (type === 'durood') bucket.durood += 1;
    if (type === 'zikr') bucket.zikr += 1;
  }

  const result = new Map<string, number>();
  for (const key of dayKeys) {
    result.set(key, pointsFromBucket(buckets.get(key) || emptyDayBucket()));
  }
  return result;
}

export async function loadMonthlyPointsRows(
  userId: string,
  year: number
): Promise<{ months: MonthPointsRow[]; yearTotal: number; live: { today: number; month: number; total: number } }> {
  const yearStart = `${year}-01-01`;
  const yearEndExclusive = `${year + 1}-01-01`;
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const todayKey = now.toISOString().slice(0, 10);

  const [pointsRes, snapRes] = await Promise.all([
    supabaseAdmin
      .from('users_points')
      .select('today_points, monthly_points, total_points, last_earned_date')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('user_monthly_progress')
      .select('month_key, month_start, total_points, leaderboard_monthly_points')
      .eq('user_id', userId)
      .gte('month_start', yearStart)
      .lt('month_start', yearEndExclusive),
  ]);

  const lastEarned = String(pointsRes.data?.last_earned_date || '').slice(0, 10);
  const liveToday =
    lastEarned === todayKey ? Math.max(0, Number(pointsRes.data?.today_points || 0)) : 0;
  const liveMonth = Math.max(0, Number(pointsRes.data?.monthly_points || 0));
  const liveTotal = Math.max(0, Number(pointsRes.data?.total_points || 0));

  const snapByKey = new Map<string, number>();
  for (const row of snapRes.data || []) {
    const key = String((row as { month_key?: string }).month_key || '').slice(0, 7);
    if (!key.startsWith(String(year))) continue;
    const pts = Math.max(
      0,
      Number(
        (row as { leaderboard_monthly_points?: number }).leaderboard_monthly_points ??
          (row as { total_points?: number }).total_points ??
          0
      )
    );
    snapByKey.set(key, pts);
  }

  const months: MonthPointsRow[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const isCurrent = key === currentMonthKey;
    if (isCurrent) {
      months.push({
        key,
        label: monthLabel(key),
        points: liveMonth,
        isCurrent: true,
        source: 'live',
      });
      continue;
    }
    if (snapByKey.has(key)) {
      months.push({
        key,
        label: monthLabel(key),
        points: snapByKey.get(key) || 0,
        isCurrent: false,
        source: 'snapshot',
      });
      continue;
    }
    // Future months or months with no snapshot yet
    const isFuture =
      year > now.getUTCFullYear() || (year === now.getUTCFullYear() && m > now.getUTCMonth() + 1);
    months.push({
      key,
      label: monthLabel(key),
      points: isFuture ? 0 : 0,
      isCurrent: false,
      source: 'estimated',
    });
  }

  const yearTotal = months.reduce((sum, row) => sum + row.points, 0);

  return {
    months,
    yearTotal,
    live: { today: liveToday, month: liveMonth, total: liveTotal },
  };
}
