import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPreviousScoreWeekRangeUtc, getScoreWeekRangeUtc, getZonedMidnightUtcIso } from '@/lib/weekly-score-core';
import { getAllScoreWeekActiveUserIds, getWeeklyScoresForUsers } from '@/lib/weekly-score';
import { addSpinWheelWinner } from '@/lib/spin-wheel-server';
import { isEligibleForWeeklyDraw } from '@/lib/leaderboard-rules';

export const AUTO_WEEKLY_WINNER_COUNT = 5;
export const WINNER_COOLDOWN_WEEKS = 4;
const REPEAT_COOLDOWN_FACTOR = 0.18;
const EVER_WON_FACTOR = 0.55;

export type WeeklyWinnerCandidate = {
  userId: string;
  name: string;
  madrasahName: string;
  weeklyScore: number;
  weeklyPoints: number;
  signedUpThisWeek: boolean;
  signedUpRecently: boolean;
  weight: number;
};

export type AutoPickWeeklyWinnersResult = {
  ok: boolean;
  message: string;
  pickedWeekStartDate: string;
  spinWeekStartDate: string;
  winners: Array<{
    userId: string;
    name: string;
    madrasahName: string;
    weeklyScore: number;
    weeklyPoints: number;
    isNewSignup: boolean;
  }>;
  skipped?: boolean;
};

function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mapUserProfile(user: Record<string, unknown>) {
  return {
    name: String(user.name || 'Friend'),
    madrasahName: String(
      user.madrasahName || user.madrasahname || user.madrasah_name || ''
    ),
    createdAt: String(user.created_at || user.createdat || ''),
  };
}

function isDateInRange(dateKey: string, startKey: string, endKey: string): boolean {
  return dateKey >= startKey && dateKey < endKey;
}

export function computeCandidateWeight(params: {
  wonRecently: boolean;
  wonBefore: boolean;
}): number {
  let weight = 1;

  if (params.wonRecently) {
    weight *= REPEAT_COOLDOWN_FACTOR;
  } else if (params.wonBefore) {
    weight *= EVER_WON_FACTOR;
  }

  return Math.max(weight, 0.01);
}

export function pickWeightedWinners<T extends { userId: string; weight: number }>(
  candidates: T[],
  count: number,
  seed: string
): T[] {
  const pool = [...candidates];
  const picked: T[] = [];
  const rand = seededRandom(hashString(seed));

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, c) => sum + c.weight, 0);
    let roll = rand() * total;
    let index = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
}

async function getWinnerHistory(): Promise<{ recent: Set<string>; ever: Set<string> }> {
  const recent = new Set<string>();
  const ever = new Set<string>();
  const cutoffWeek = addDaysToDateKey(getPreviousScoreWeekRangeUtc().weekStartDate, -(WINNER_COOLDOWN_WEEKS * 7));

  const { data, error } = await supabaseAdmin
    .from('weekly_winner_pick_log')
    .select('user_id, week_start_date');

  if (error) {
    if (error.code === '42P01') return { recent, ever };
    throw error;
  }

  for (const row of data || []) {
    const uid = String((row as { user_id: string }).user_id || '');
    const week = String((row as { week_start_date: string }).week_start_date || '').slice(0, 10);
    if (!uid) continue;
    ever.add(uid);
    if (week >= cutoffWeek) {
      recent.add(uid);
    }
  }

  return { recent, ever };
}

async function alreadyPickedForWeek(weekStartDate: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('weekly_winner_pick_log')
    .select('id', { count: 'exact', head: true })
    .eq('week_start_date', weekStartDate);

  if (error) {
    if (error.code === '42P01') return false;
    throw error;
  }

  return Number(count ?? 0) > 0;
}

export async function autoPickWeeklyWinners(options?: {
  /** Score week to evaluate (defaults to the week that just ended). */
  forWeekStartDate?: string;
  winnerCount?: number;
  force?: boolean;
}): Promise<AutoPickWeeklyWinnersResult> {
  const spinWeek = getScoreWeekRangeUtc();
  const pickedWeek = options?.forWeekStartDate
    ? {
        weekStartDate: options.forWeekStartDate,
        weekEndDate: addDaysToDateKey(options.forWeekStartDate, 7),
        weekStartIso: '',
        weekEndIso: '',
      }
  : getPreviousScoreWeekRangeUtc();

  if (!options?.forWeekStartDate) {
    const prev = getPreviousScoreWeekRangeUtc();
    pickedWeek.weekStartIso = prev.weekStartIso;
    pickedWeek.weekEndIso = prev.weekEndIso;
  } else {
    pickedWeek.weekStartIso = getZonedMidnightUtcIso(pickedWeek.weekStartDate);
    pickedWeek.weekEndIso = getZonedMidnightUtcIso(pickedWeek.weekEndDate);
  }

  const weekStartDate = pickedWeek.weekStartDate;
  const winnerCount = options?.winnerCount ?? AUTO_WEEKLY_WINNER_COUNT;

  if (!options?.force && (await alreadyPickedForWeek(weekStartDate))) {
    return {
      ok: true,
      skipped: true,
      message: `Winners already picked for week starting ${weekStartDate}`,
      pickedWeekStartDate: weekStartDate,
      spinWeekStartDate: spinWeek.weekStartDate,
      winners: [],
    };
  }

  if (options?.force) {
    await supabaseAdmin.from('weekly_winner_announcements').delete().eq('week_start_date', weekStartDate);
    await supabaseAdmin.from('weekly_winner_pick_log').delete().eq('week_start_date', weekStartDate);
    await supabaseAdmin.from('weekly_winners').delete().eq('week_start_date', weekStartDate);
  }

  const activeUserIds = await getAllScoreWeekActiveUserIds(
    pickedWeek.weekStartIso,
    pickedWeek.weekEndIso
  );

  if (!activeUserIds.length) {
    return {
      ok: false,
      message: 'No active learners found for the completed week.',
      pickedWeekStartDate: weekStartDate,
      spinWeekStartDate: spinWeek.weekStartDate,
      winners: [],
    };
  }

  const [scoresMap, pointsRes, usersRes, winnerHistory] = await Promise.all([
    getWeeklyScoresForUsers(activeUserIds, pickedWeek.weekStartIso, pickedWeek.weekEndIso),
    supabaseAdmin.from('users_points').select('user_id, weekly_points, badges, level').in('user_id', activeUserIds),
    supabaseAdmin.from('users').select('*').in('uid', activeUserIds),
    getWinnerHistory(),
  ]);

  const { recent: recentWinners, ever: everWinners } = winnerHistory;

  const pointsByUser = new Map<string, number>();
  const levelByUser = new Map<string, number>();
  for (const row of pointsRes.data || []) {
    const uid = String((row as { user_id: string }).user_id);
    pointsByUser.set(uid, Number((row as { weekly_points: number }).weekly_points ?? 0));
    levelByUser.set(uid, Number((row as { level: number }).level ?? 1));
  }

  const usersById = new Map<string, ReturnType<typeof mapUserProfile>>();
  for (const user of usersRes.data || []) {
    const uid = String((user as { uid: string }).uid);
    usersById.set(uid, mapUserProfile(user as Record<string, unknown>));
  }

  const signupWeekEnd = addDaysToDateKey(weekStartDate, 7);
  const recentSignupCutoff = addDaysToDateKey(weekStartDate, -28);

  const candidates: WeeklyWinnerCandidate[] = [];

  for (const userId of activeUserIds) {
    const weeklyScore = scoresMap.get(userId) ?? 0;
    const weeklyPoints = pointsByUser.get(userId) ?? 0;
    const profile = usersById.get(userId) || { name: 'Friend', madrasahName: '', createdAt: '' };
    const createdKey = profile.createdAt ? profile.createdAt.slice(0, 10) : '';

    const signedUpThisWeek = createdKey
      ? isDateInRange(createdKey, weekStartDate, signupWeekEnd)
      : false;
    const signedUpRecently = createdKey ? createdKey >= recentSignupCutoff : false;

    if (!isEligibleForWeeklyDraw(weeklyPoints)) {
      continue;
    }

    const weight = computeCandidateWeight({
      wonRecently: recentWinners.has(userId),
      wonBefore: everWinners.has(userId),
    });

    candidates.push({
      userId,
      name: profile.name,
      madrasahName: profile.madrasahName,
      weeklyScore,
      weeklyPoints,
      signedUpThisWeek,
      signedUpRecently,
      weight,
    });
  }

  if (!candidates.length) {
    return {
      ok: false,
      message: 'No eligible learners met the minimum activity threshold.',
      pickedWeekStartDate: weekStartDate,
      spinWeekStartDate: spinWeek.weekStartDate,
      winners: [],
    };
  }

  const seed = `${weekStartDate}:auto-pick`;
  const winners = pickWeightedWinners(candidates, winnerCount, seed);

  const { data: existingFeatured } = await supabaseAdmin.from('featured_winners').select('user_id');
  if (existingFeatured?.length) {
    await supabaseAdmin
      .from('featured_winners')
      .delete()
      .in(
        'user_id',
        existingFeatured.map((row) => String((row as { user_id: string }).user_id))
      );
  }

  const announced: AutoPickWeeklyWinnersResult['winners'] = [];

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    await addSpinWheelWinner(winner.userId);

    await supabaseAdmin
      .from('featured_winners')
      .update({ week_start_date: spinWeek.weekStartDate })
      .eq('user_id', winner.userId);

    await supabaseAdmin.from('weekly_winner_announcements').insert({
      winner_name: winner.name,
      madrasah_name: winner.madrasahName || null,
      week_start_date: weekStartDate,
      user_id: winner.userId,
    });

    await supabaseAdmin.from('weekly_winner_pick_log').upsert(
      {
        user_id: winner.userId,
        week_start_date: weekStartDate,
        weekly_score: winner.weeklyScore,
        weekly_points: winner.weeklyPoints,
        is_new_signup: winner.signedUpThisWeek,
      },
      { onConflict: 'user_id,week_start_date' }
    );

    const level = levelByUser.get(winner.userId) ?? 1;
    if (i === 0) {
      let prizeTier = 'Junior Explorer Prize';
      if (level >= 10) prizeTier = 'Grand Master Prize';
      else if (level >= 5) prizeTier = 'Advanced Scholar Prize';

      const { error: wwError } = await supabaseAdmin.from('weekly_winners').upsert(
        {
          week_start_date: weekStartDate,
          week_end_date: addDaysToDateKey(weekStartDate, 6),
          winner_user_id: winner.userId,
          winning_score: winner.weeklyPoints,
          prize_tier: prizeTier,
          notified: true,
        },
        { onConflict: 'week_start_date' }
      );
      if (wwError && wwError.code !== '42P01') {
        console.warn('[autoPick] weekly_winners insert:', wwError.message);
      }
    }

    announced.push({
      userId: winner.userId,
      name: winner.name,
      madrasahName: winner.madrasahName,
      weeklyScore: winner.weeklyScore,
      weeklyPoints: winner.weeklyPoints,
      isNewSignup: winner.signedUpThisWeek,
    });
  }

  return {
    ok: true,
    message: `Picked ${announced.length} winner(s) for week ${weekStartDate}. They can spin during week ${spinWeek.weekStartDate}.`,
    pickedWeekStartDate: weekStartDate,
    spinWeekStartDate: spinWeek.weekStartDate,
    winners: announced,
  };
}
