import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { toDateKey, utcDateKey } from '@/lib/date-keys';
import {
  EMPTY_STREAK_STATE,
  buildStreakSnapshot,
  type StreakSnapshotCore,
  type StreakState,
} from '@/lib/daily-streak-core';

export type DailyStreakSnapshot = StreakSnapshotCore;

export type DailyStreakAction = 'claim' | 'repair';

export type DailyStreakClaimResult = {
  ok: boolean;
  action: DailyStreakAction;
  message: string;
  pointsAwarded: number;
  isComeback: boolean;
  snapshot: DailyStreakSnapshot;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
};

async function readStreakState(userId: string): Promise<StreakState> {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_streak_state')
      .select('current_streak, longest_streak, total_claims, last_claim_date, last_repair_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return { ...EMPTY_STREAK_STATE };

    return {
      currentStreak: Number(data.current_streak ?? 0),
      longestStreak: Number(data.longest_streak ?? 0),
      totalClaims: Number(data.total_claims ?? 0),
      lastClaimDate: toDateKey(data.last_claim_date),
      lastRepairDate: toDateKey(data.last_repair_date),
    };
  } catch {
    return { ...EMPTY_STREAK_STATE };
  }
}

export async function getDailyStreakSnapshot(userId: string): Promise<DailyStreakSnapshot> {
  const state = await readStreakState(userId);
  return buildStreakSnapshot(state, utcDateKey());
}

function reasonMessage(action: DailyStreakAction, reason: string | undefined): string {
  if (reason === 'already_claimed') {
    return action === 'repair' ? 'Today is already counted — come back tomorrow.' : 'You already claimed today’s streak reward. Come back tomorrow!';
  }
  if (reason === 'repair_cooldown') return 'You’ve already used a streak repair this week. Keep going to rebuild it!';
  return 'Your streak is safe — no repair needed today.';
}

export async function claimDailyStreak(
  userId: string,
  action: DailyStreakAction = 'claim'
): Promise<DailyStreakClaimResult> {
  const todayKey = utcDateKey();
  const state = await readStreakState(userId);
  const snapshot = buildStreakSnapshot(state, todayKey);
  const preview = action === 'repair' ? snapshot.repair : snapshot.claim;

  if (!preview.available) {
    return {
      ok: false,
      action,
      message: reasonMessage(action, preview.reason),
      pointsAwarded: 0,
      isComeback: false,
      snapshot,
    };
  }

  const kind = action === 'repair' ? 'repair' : preview.isComeback ? 'comeback' : 'ladder';

  const { error: insertError } = await supabaseAdmin.from('daily_streak_claims').insert({
    user_id: userId,
    claim_date: todayKey,
    day_index: preview.dayIndex,
    points: preview.totalPoints,
    kind,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      const refreshed = await getDailyStreakSnapshot(userId);
      return {
        ok: false,
        action,
        message: 'Today’s streak reward is already banked.',
        pointsAwarded: 0,
        isComeback: false,
        snapshot: refreshed,
      };
    }
    throw insertError;
  }

  const successMessage = preview.isComeback
    ? `Welcome back! Day ${preview.dayIndex} of your streak — +${preview.basePoints} plus a ${preview.bonusPoints}-point comeback gift.`
    : action === 'repair'
      ? `Streak repaired! You’re on day ${preview.nextStreak} of your streak.`
      : `Day ${preview.dayIndex} streak reward claimed!`;

  const award = await awardPointsWithDailyCapByUserId(userId, preview.totalPoints, {
    countTowardDailyLimit: true,
    successMessage,
  });

  const nextLongest = Math.max(state.longestStreak, preview.nextStreak);

  const { error: stateError } = await supabaseAdmin.from('daily_streak_state').upsert(
    {
      user_id: userId,
      current_streak: preview.nextStreak,
      longest_streak: nextLongest,
      total_claims: state.totalClaims + 1,
      last_claim_date: todayKey,
      last_repair_date: action === 'repair' ? todayKey : state.lastRepairDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (stateError) {
    console.error('[daily-streak] state upsert failed:', stateError.message);
  }

  const refreshed = await getDailyStreakSnapshot(userId);

  return {
    ok: true,
    action,
    message: award.message,
    pointsAwarded: award.pointsAwarded,
    isComeback: preview.isComeback,
    snapshot: refreshed,
    profile:
      award.hasReliableTotals !== false && award.reason !== 'update_failed'
        ? {
            points: award.totalPoints ?? 0,
            weeklyPoints: award.weeklyPoints ?? 0,
            monthlyPoints: award.monthlyPoints ?? 0,
            todayPoints: award.todayPoints ?? 0,
          }
        : undefined,
  };
}
