import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { countGameEarningSessions, isGameEarningSessionRow } from '@/lib/daily-activity-limits';
import {
  WEEKLY_CHEST_BADGE,
  buildWeeklyQuestBoard,
  isQuestKey,
  type QuestKey,
  type WeeklyQuestBoard,
} from '@/lib/weekly-quests-core';

export type { QuestKey, WeeklyQuestBoard } from '@/lib/weekly-quests-core';

function isoDateKey(value: unknown): string {
  const d = new Date(String(value || ''));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function plainDateKey(value: unknown): string {
  const raw = value ? String(value).slice(0, 10) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

async function readWeeklyProgress(
  userId: string,
  week: { weekStartIso: string; weekEndIso: string; weekStartDate: string; weekEndDate: string }
): Promise<Partial<Record<QuestKey, number>>> {
  const empty: Partial<Record<QuestKey, number>> = {
    active_days: 0,
    quiz_sprint: 0,
    game_explorer: 0,
    salah_keeper: 0,
    good_deeds: 0,
  };

  try {
    const [quizRes, gameRes, salahRes, habitRes] = await Promise.all([
      supabaseAdmin
        .from('quiz_attempts')
        .select('completed_at')
        .eq('user_id', userId)
        .gte('completed_at', week.weekStartIso)
        .lt('completed_at', week.weekEndIso),
      supabaseAdmin
        .from('game_progress')
        .select('playedat, gameid, points')
        .eq('uid', userId)
        .gte('playedat', week.weekStartIso)
        .lt('playedat', week.weekEndIso),
      supabaseAdmin
        .from('salah_entries')
        .select('date')
        .eq('user_id', userId)
        .gte('date', week.weekStartDate)
        .lt('date', week.weekEndDate),
      supabaseAdmin
        .from('kids_zone_feature_progress')
        .select('date, good_deeds')
        .eq('user_id', userId)
        .gte('date', week.weekStartDate)
        .lt('date', week.weekEndDate),
    ]);

    const activeDays = new Set<string>();

    for (const row of quizRes.data || []) {
      const key = isoDateKey(row.completed_at);
      if (key) activeDays.add(key);
    }

    const gameRows = (gameRes.data || []).filter(isGameEarningSessionRow);
    for (const row of gameRows) {
      const key = isoDateKey(row.playedat);
      if (key) activeDays.add(key);
    }

    const salahDays = new Set<string>();
    for (const row of salahRes.data || []) {
      const key = plainDateKey(row.date);
      if (!key) continue;
      salahDays.add(key);
      activeDays.add(key);
    }

    let goodDeeds = 0;
    for (const row of habitRes.data || []) {
      const deeds = Array.isArray(row.good_deeds) ? row.good_deeds : [];
      if (!deeds.length) continue;
      goodDeeds += deeds.length;
      const key = plainDateKey(row.date);
      if (key) activeDays.add(key);
    }

    return {
      active_days: activeDays.size,
      quiz_sprint: (quizRes.data || []).length,
      game_explorer: countGameEarningSessions(gameRes.data || []),
      salah_keeper: salahDays.size,
      good_deeds: goodDeeds,
    };
  } catch (error) {
    console.error('[weekly-quests] progress read failed:', error);
    return empty;
  }
}

export async function getWeeklyQuestBoard(userId: string): Promise<WeeklyQuestBoard> {
  const week = getScoreWeekRangeUtc();

  const [progress, claimsRes, chestRes] = await Promise.all([
    readWeeklyProgress(userId, week),
    supabaseAdmin
      .from('weekly_quest_claims')
      .select('quest_key')
      .eq('user_id', userId)
      .eq('week_start_date', week.weekStartDate),
    supabaseAdmin
      .from('weekly_quest_chest_claims')
      .select('claimed_at')
      .eq('user_id', userId)
      .eq('week_start_date', week.weekStartDate)
      .maybeSingle(),
  ]);

  const claimedKeys = (claimsRes.data || [])
    .map((row) => String(row.quest_key || ''))
    .filter(Boolean);

  return buildWeeklyQuestBoard({
    todayKey: new Date().toISOString().slice(0, 10),
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    progress,
    claimedKeys,
    chestClaimedAt: chestRes.data?.claimed_at ? String(chestRes.data.claimed_at) : null,
  });
}

export type WeeklyQuestClaimResult = {
  ok: boolean;
  message: string;
  pointsAwarded: number;
  board: WeeklyQuestBoard;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
};

function profileFromAward(award: {
  hasReliableTotals?: boolean;
  reason?: string;
  totalPoints?: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  todayPoints?: number;
}): WeeklyQuestClaimResult['profile'] {
  if (award.hasReliableTotals === false || award.reason === 'update_failed') return undefined;
  return {
    points: award.totalPoints ?? 0,
    weeklyPoints: award.weeklyPoints ?? 0,
    monthlyPoints: award.monthlyPoints ?? 0,
    todayPoints: award.todayPoints ?? 0,
  };
}

export async function claimWeeklyQuest(
  userId: string,
  rawQuestKey: string
): Promise<WeeklyQuestClaimResult> {
  const board = await getWeeklyQuestBoard(userId);

  if (!isQuestKey(rawQuestKey)) {
    return { ok: false, message: 'Unknown quest.', pointsAwarded: 0, board };
  }

  const status = board.quests.find((quest) => quest.key === rawQuestKey);
  if (!status) {
    return { ok: false, message: 'Unknown quest.', pointsAwarded: 0, board };
  }

  if (status.claimed) {
    return { ok: true, message: `You already banked “${status.title}”.`, pointsAwarded: 0, board };
  }

  if (!status.completed) {
    const remaining = Math.max(0, status.target - status.progress);
    return {
      ok: false,
      message: `${remaining} more ${status.unit} to go for “${status.title}”.`,
      pointsAwarded: 0,
      board,
    };
  }

  const { error: insertError } = await supabaseAdmin.from('weekly_quest_claims').insert({
    user_id: userId,
    week_start_date: board.weekStartDate,
    quest_key: status.key,
    points_awarded: status.points,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const refreshed = await getWeeklyQuestBoard(userId);
      return { ok: true, message: 'Quest already banked.', pointsAwarded: 0, board: refreshed };
    }
    throw insertError;
  }

  const award = await awardPointsWithDailyCapByUserId(userId, status.points, {
    countTowardDailyLimit: true,
    successMessage: `Quest complete: “${status.title}”!`,
  });

  const refreshed = await getWeeklyQuestBoard(userId);

  return {
    ok: true,
    message: award.message,
    pointsAwarded: award.pointsAwarded,
    board: refreshed,
    profile: profileFromAward(award),
  };
}

export async function claimWeeklyChest(userId: string): Promise<WeeklyQuestClaimResult> {
  const board = await getWeeklyQuestBoard(userId);

  if (board.chest.claimed) {
    return { ok: true, message: 'This week’s chest is already open.', pointsAwarded: 0, board };
  }

  if (!board.chest.unlocked) {
    const remaining = board.summary.totalCount - board.summary.completedCount;
    return {
      ok: false,
      message: `Finish ${remaining} more quest${remaining === 1 ? '' : 's'} to unlock the weekly chest.`,
      pointsAwarded: 0,
      board,
    };
  }

  const { error: insertError } = await supabaseAdmin.from('weekly_quest_chest_claims').insert({
    user_id: userId,
    week_start_date: board.weekStartDate,
    points_awarded: board.chest.points,
    badge_name: WEEKLY_CHEST_BADGE,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const refreshed = await getWeeklyQuestBoard(userId);
      return { ok: true, message: 'Chest already opened.', pointsAwarded: 0, board: refreshed };
    }
    throw insertError;
  }

  const award = await awardPointsWithDailyCapByUserId(userId, board.chest.points, {
    countTowardDailyLimit: true,
    successMessage: `Weekly chest opened! Badge “${WEEKLY_CHEST_BADGE}”.`,
  });

  const refreshed = await getWeeklyQuestBoard(userId);

  return {
    ok: true,
    message: award.message,
    pointsAwarded: award.pointsAwarded,
    board: refreshed,
    profile: profileFromAward(award),
  };
}
