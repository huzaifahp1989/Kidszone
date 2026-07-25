import { describe, expect, it } from 'vitest';
import { mergePointsAfterAward, mergeTodayPoints } from '@/lib/profile-points-merge';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';

describe('mergeTodayPoints', () => {
  it('trusts API when it is higher or equal', () => {
    expect(mergeTodayPoints(25, 50)).toBe(50);
    expect(mergeTodayPoints(25, 25)).toBe(25);
  });

  it('keeps local total when API is stale after a recent award', () => {
    expect(mergeTodayPoints(25, 0)).toBe(25);
    expect(mergeTodayPoints(175, 150)).toBe(175);
  });

  it('allows UTC day reset when yesterday hit the daily cap', () => {
    expect(mergeTodayPoints(POINTS_DAILY_CAP, 0)).toBe(0);
  });
});

describe('mergePointsAfterAward', () => {
  it('applies optimistic delta when server profile is missing', () => {
    expect(
      mergePointsAfterAward({ points: 100, weeklyPoints: 40, monthlyPoints: 40, todayPoints: 25 }, 25)
    ).toEqual({
      points: 125,
      weeklyPoints: 65,
      monthlyPoints: 65,
      todayPoints: 50,
    });
  });

  it('prefers the higher of server vs optimistic totals', () => {
    expect(
      mergePointsAfterAward(
        { points: 500, weeklyPoints: 50, monthlyPoints: 50, todayPoints: 25 },
        25,
        { points: 520, weeklyPoints: 75, monthlyPoints: 75, todayPoints: 50 }
      )
    ).toEqual({
      points: 525,
      weeklyPoints: 75,
      monthlyPoints: 75,
      todayPoints: 50,
    });
  });
});
