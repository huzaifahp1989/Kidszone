import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_BONUS_POINTS,
  DAILY_PLAN_TOTAL_POINTS,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
  resolvePointsToAward,
} from '@/lib/points-policy';

describe('resolvePointsToAward', () => {
  it('caps daily awards at 200 points', () => {
    expect(resolvePointsToAward(50, 180, true)).toBe(20);
    expect(resolvePointsToAward(50, 200, true)).toBe(0);
    expect(POINTS_DAILY_CAP).toBe(200);
    expect(QUIZ_POINTS_PER_COMPLETION).toBe(25);
    expect(ACTIVITY_BONUS_POINTS).toBe(25);
    expect(DAILY_PLAN_TOTAL_POINTS).toBe(200);
  });

  it('does not block awards when weekly points are already high', () => {
    expect(resolvePointsToAward(25, 0, true)).toBe(25);
    expect(resolvePointsToAward(25, 50, true)).toBe(25);
  });

  it('skips daily cap when countTowardDailyLimit is false', () => {
    expect(resolvePointsToAward(30, 200, false)).toBe(30);
  });
});
