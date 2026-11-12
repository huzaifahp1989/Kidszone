import { describe, expect, it } from 'vitest';
import { addDaysToDateKey, diffDays } from '@/lib/date-keys';
import {
  EMPTY_STREAK_STATE,
  STREAK_LADDER_LENGTH,
  STREAK_LADDER_POINTS,
  STREAK_REPAIR_COOLDOWN_DAYS,
  WELCOME_BACK_GIFT_POINTS,
  buildStreakSnapshot,
  ladderDayIndexForStreak,
  ladderPointsForStreak,
  planClaim,
  planRepair,
  type StreakState,
} from '@/lib/daily-streak-core';

const TODAY = '2026-10-27';

function state(overrides: Partial<StreakState> = {}): StreakState {
  return { ...EMPTY_STREAK_STATE, ...overrides };
}

describe('daily-streak-core date helpers', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(addDaysToDateKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToDateKey('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures whole days between date keys', () => {
    expect(diffDays('2026-10-26', '2026-10-27')).toBe(1);
    expect(diffDays('2026-10-20', '2026-10-27')).toBe(7);
    expect(diffDays('2026-10-27', '2026-10-27')).toBe(0);
  });
});

describe('daily-streak-core ladder', () => {
  it('maps streaks onto the 7-step ladder and caps at the top step', () => {
    expect(ladderDayIndexForStreak(0)).toBe(1);
    expect(ladderDayIndexForStreak(1)).toBe(1);
    expect(ladderDayIndexForStreak(7)).toBe(7);
    expect(ladderDayIndexForStreak(8)).toBe(STREAK_LADDER_LENGTH);
    expect(ladderDayIndexForStreak(99)).toBe(STREAK_LADDER_LENGTH);
  });

  it('awards the matching points for each ladder step', () => {
    expect(ladderPointsForStreak(1)).toBe(STREAK_LADDER_POINTS[0]);
    expect(ladderPointsForStreak(3)).toBe(STREAK_LADDER_POINTS[2]);
    expect(ladderPointsForStreak(7)).toBe(STREAK_LADDER_POINTS[6]);
    expect(ladderPointsForStreak(20)).toBe(STREAK_LADDER_POINTS[6]);
  });
});

describe('planClaim', () => {
  it('starts a first-ever streak on day 1', () => {
    const plan = planClaim(state(), TODAY);
    expect(plan.available).toBe(true);
    expect(plan.nextStreak).toBe(1);
    expect(plan.dayIndex).toBe(1);
    expect(plan.bonusPoints).toBe(0);
    expect(plan.isComeback).toBe(false);
  });

  it('advances the streak when yesterday was claimed', () => {
    const plan = planClaim(state({ currentStreak: 3, lastClaimDate: '2026-10-26' }), TODAY);
    expect(plan.nextStreak).toBe(4);
    expect(plan.dayIndex).toBe(4);
    expect(plan.basePoints).toBe(STREAK_LADDER_POINTS[3]);
    expect(plan.isComeback).toBe(false);
  });

  it('refuses a second claim on the same day', () => {
    const plan = planClaim(state({ currentStreak: 2, lastClaimDate: TODAY }), TODAY);
    expect(plan.available).toBe(false);
    expect(plan.reason).toBe('already_claimed');
  });

  it('resets to day 1 and adds a welcome-back gift after a break', () => {
    const plan = planClaim(state({ currentStreak: 6, longestStreak: 6, lastClaimDate: '2026-10-23' }), TODAY);
    expect(plan.available).toBe(true);
    expect(plan.nextStreak).toBe(1);
    expect(plan.isComeback).toBe(true);
    expect(plan.basePoints).toBe(STREAK_LADDER_POINTS[0]);
    expect(plan.bonusPoints).toBe(WELCOME_BACK_GIFT_POINTS);
    expect(plan.totalPoints).toBe(STREAK_LADDER_POINTS[0] + WELCOME_BACK_GIFT_POINTS);
  });

  it('does not gift a welcome-back bonus after only a one-day gap or a tiny streak', () => {
    const tinyStreak = planClaim(state({ currentStreak: 1, lastClaimDate: '2026-10-25' }), TODAY);
    expect(tinyStreak.nextStreak).toBe(1);
    expect(tinyStreak.isComeback).toBe(false);

    const oneDayGap = planClaim(state({ currentStreak: 4, lastClaimDate: '2026-10-26' }), TODAY);
    expect(oneDayGap.isComeback).toBe(false);
    expect(oneDayGap.nextStreak).toBe(5);
  });
});

describe('planRepair', () => {
  it('bridges the gap and keeps the streak alive', () => {
    const plan = planRepair(state({ currentStreak: 5, lastClaimDate: '2026-10-24' }), TODAY);
    expect(plan.available).toBe(true);
    expect(plan.nextStreak).toBe(6);
    expect(plan.totalPoints).toBe(STREAK_LADDER_POINTS[5]);
  });

  it('is unavailable when there is nothing to repair', () => {
    expect(planRepair(state(), TODAY).reason).toBe('no_broken_streak');
    expect(planRepair(state({ currentStreak: 1, lastClaimDate: '2026-10-24' }), TODAY).reason).toBe(
      'no_broken_streak'
    );
    expect(planRepair(state({ currentStreak: 9, lastClaimDate: '2026-10-26' }), TODAY).reason).toBe(
      'no_broken_streak'
    );
  });

  it('enforces the once-a-week repair cooldown', () => {
    const recent = planRepair(
      state({ currentStreak: 5, lastClaimDate: '2026-10-24', lastRepairDate: '2026-10-25' }),
      TODAY
    );
    expect(recent.available).toBe(false);
    expect(recent.reason).toBe('repair_cooldown');

    const elapsed = planRepair(
      state({
        currentStreak: 5,
        lastClaimDate: '2026-10-24',
        lastRepairDate: addDaysToDateKey(TODAY, -STREAK_REPAIR_COOLDOWN_DAYS),
      }),
      TODAY
    );
    expect(elapsed.available).toBe(true);
  });

  it('is unavailable once today is already claimed', () => {
    const plan = planRepair(state({ currentStreak: 5, lastClaimDate: TODAY }), TODAY);
    expect(plan.available).toBe(false);
    expect(plan.reason).toBe('already_claimed');
  });
});

describe('buildStreakSnapshot', () => {
  it('marks the ladder steps completed so far', () => {
    const snapshot = buildStreakSnapshot(
      state({ currentStreak: 3, longestStreak: 4, lastClaimDate: TODAY, totalClaims: 3 }),
      TODAY
    );
    expect(snapshot.claimedToday).toBe(true);
    expect(snapshot.atRisk).toBe(false);
    expect(snapshot.canClaim).toBe(false);
    expect(snapshot.ladder.map((step) => step.claimed)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('flags the streak as at risk before today is claimed', () => {
    const snapshot = buildStreakSnapshot(
      state({ currentStreak: 4, lastClaimDate: '2026-10-26' }),
      TODAY
    );
    expect(snapshot.claimedToday).toBe(false);
    expect(snapshot.atRisk).toBe(true);
    expect(snapshot.canClaim).toBe(true);
    expect(snapshot.daysSinceClaim).toBe(1);
  });

  it('offers both a normal claim and a repair after a break', () => {
    const snapshot = buildStreakSnapshot(
      state({ currentStreak: 5, longestStreak: 5, lastClaimDate: '2026-10-23' }),
      TODAY
    );
    expect(snapshot.canRepair).toBe(true);
    expect(snapshot.claim.isComeback).toBe(true);
    expect(snapshot.daysSinceClaim).toBe(4);
  });
});
