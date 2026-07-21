import { describe, expect, it } from 'vitest';
import {
  getWeeklyDrawPointsRemaining,
  isEligibleForWeeklyDraw,
  WEEKLY_DRAW_MIN_POINTS,
} from '@/lib/leaderboard-rules';

describe('weekly draw rules', () => {
  it('requires more than 150 points for draw entry', () => {
    expect(isEligibleForWeeklyDraw(150)).toBe(false);
    expect(isEligibleForWeeklyDraw(151)).toBe(true);
    expect(WEEKLY_DRAW_MIN_POINTS).toBe(150);
  });

  it('calculates remaining points until draw eligibility', () => {
    expect(getWeeklyDrawPointsRemaining(120)).toBe(31);
    expect(getWeeklyDrawPointsRemaining(151)).toBe(0);
  });
});
