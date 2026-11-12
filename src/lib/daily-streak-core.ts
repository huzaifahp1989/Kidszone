/**
 * Pure logic for the daily login streak: a 7-day claim ladder, a welcome-back
 * gift after a break, and a once-a-week streak repair.
 *
 * Deliberately free of DB/network access so it can be unit tested directly.
 * All date keys are UTC (YYYY-MM-DD) to match the daily points cap.
 */

import { diffDays, utcDateKey } from '@/lib/date-keys';

/** Points awarded for ladder day 1..7. Long streaks stay on the top step. */
export const STREAK_LADDER_POINTS = [5, 8, 12, 16, 20, 30, 50] as const;
export const STREAK_LADDER_LENGTH = STREAK_LADDER_POINTS.length;

/** One-off gift the first time a learner comes back after missing a day. */
export const WELCOME_BACK_GIFT_POINTS = 25;
/** A gap of this many days (or more) counts as "been away". */
export const WELCOME_BACK_MIN_GAP_DAYS = 2;

/** Repairing a broken streak is allowed once every this many days. */
export const STREAK_REPAIR_COOLDOWN_DAYS = 7;
/** Only streaks worth saving can be repaired. */
export const STREAK_REPAIR_MIN_STREAK = 2;

/** Which ladder step a streak sits on: 1..7, capped at the top step. */
export function ladderDayIndexForStreak(streak: number): number {
  if (!Number.isFinite(streak) || streak < 1) return 1;
  return Math.min(Math.floor(streak), STREAK_LADDER_LENGTH);
}

export function ladderPointsForStreak(streak: number): number {
  return STREAK_LADDER_POINTS[ladderDayIndexForStreak(streak) - 1];
}

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  totalClaims: number;
  lastClaimDate: string | null;
  lastRepairDate: string | null;
};

export const EMPTY_STREAK_STATE: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  totalClaims: 0,
  lastClaimDate: null,
  lastRepairDate: null,
};

export type StreakUnavailableReason = 'already_claimed' | 'no_broken_streak' | 'repair_cooldown';

export type StreakPreview = {
  available: boolean;
  reason?: StreakUnavailableReason;
  /** Streak the learner would hold after taking this action. */
  nextStreak: number;
  dayIndex: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  isComeback: boolean;
};

export type StreakSnapshotCore = {
  todayKey: string;
  state: StreakState;
  claimedToday: boolean;
  daysSinceClaim: number | null;
  canClaim: boolean;
  canRepair: boolean;
  /** True while today's step is still unclaimed. */
  atRisk: boolean;
  claim: StreakPreview;
  repair: StreakPreview;
  ladder: { dayIndex: number; points: number; claimed: boolean }[];
};

function unavailable(
  reason: StreakUnavailableReason,
  state: StreakState
): StreakPreview {
  const projected = state.currentStreak > 0 ? state.currentStreak : 1;
  return {
    available: false,
    reason,
    nextStreak: projected,
    dayIndex: ladderDayIndexForStreak(projected),
    basePoints: ladderPointsForStreak(projected),
    bonusPoints: 0,
    totalPoints: 0,
    isComeback: false,
  };
}

/** What a normal daily claim would give right now. */
export function planClaim(state: StreakState, todayKey: string = utcDateKey()): StreakPreview {
  if (state.lastClaimDate === todayKey) return unavailable('already_claimed', state);

  const gap = state.lastClaimDate ? diffDays(state.lastClaimDate, todayKey) : null;
  const consecutive = gap === 1;
  const nextStreak = consecutive ? state.currentStreak + 1 : 1;
  const isComeback =
    !consecutive && gap !== null && gap >= WELCOME_BACK_MIN_GAP_DAYS && state.currentStreak >= 2;
  const basePoints = ladderPointsForStreak(nextStreak);
  const bonusPoints = isComeback ? WELCOME_BACK_GIFT_POINTS : 0;

  return {
    available: true,
    nextStreak,
    dayIndex: ladderDayIndexForStreak(nextStreak),
    basePoints,
    bonusPoints,
    totalPoints: basePoints + bonusPoints,
    isComeback,
  };
}

/** What a streak repair would give right now (bridges the missed days). */
export function planRepair(state: StreakState, todayKey: string = utcDateKey()): StreakPreview {
  if (state.lastClaimDate === todayKey) return unavailable('already_claimed', state);
  if (!state.lastClaimDate) return unavailable('no_broken_streak', state);

  const gap = diffDays(state.lastClaimDate, todayKey);
  if (gap < WELCOME_BACK_MIN_GAP_DAYS || state.currentStreak < STREAK_REPAIR_MIN_STREAK) {
    return unavailable('no_broken_streak', state);
  }
  if (
    state.lastRepairDate &&
    diffDays(state.lastRepairDate, todayKey) < STREAK_REPAIR_COOLDOWN_DAYS
  ) {
    return unavailable('repair_cooldown', state);
  }

  const nextStreak = state.currentStreak + 1;
  return {
    available: true,
    nextStreak,
    dayIndex: ladderDayIndexForStreak(nextStreak),
    basePoints: ladderPointsForStreak(nextStreak),
    bonusPoints: 0,
    totalPoints: ladderPointsForStreak(nextStreak),
    isComeback: false,
  };
}

export function buildStreakSnapshot(
  state: StreakState,
  todayKey: string = utcDateKey()
): StreakSnapshotCore {
  const claimedToday = state.lastClaimDate === todayKey;
  const daysSinceClaim = state.lastClaimDate ? diffDays(state.lastClaimDate, todayKey) : null;
  const claim = planClaim(state, todayKey);
  const repair = planRepair(state, todayKey);

  const completedSteps = Math.min(Math.max(state.currentStreak, 0), STREAK_LADDER_LENGTH);
  const ladder = STREAK_LADDER_POINTS.map((points, index) => ({
    dayIndex: index + 1,
    points,
    claimed: index + 1 <= completedSteps,
  }));

  return {
    todayKey,
    state,
    claimedToday,
    daysSinceClaim,
    canClaim: claim.available,
    canRepair: repair.available,
    atRisk: !claimedToday,
    claim,
    repair,
    ladder,
  };
}
