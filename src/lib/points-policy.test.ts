import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_BONUS_POINTS,
  AUDIO_COMPETITION_APPROVED_POINTS,
  DAILY_PLAN_TOTAL_POINTS,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
  getAudioCompetitionAwardPoints,
  resolveBasePoints,
  resolvePointsToAward,
} from '@/lib/points-policy';

describe('resolvePointsToAward', () => {
  it('caps daily awards at 200 points', () => {
    expect(resolvePointsToAward(50, 180, true)).toBe(20);
    expect(resolvePointsToAward(50, 200, true)).toBe(0);
    expect(POINTS_DAILY_CAP).toBe(200);
    expect(QUIZ_POINTS_PER_COMPLETION).toBe(25);
    expect(ACTIVITY_BONUS_POINTS).toBe(25);
    // Plan rows can sum above the daily cap — kids pick a mix up to POINTS_DAILY_CAP.
    expect(DAILY_PLAN_TOTAL_POINTS).toBeGreaterThanOrEqual(POINTS_DAILY_CAP);
  });

  it('does not block awards when weekly points are already high', () => {
    expect(resolvePointsToAward(25, 0, true)).toBe(25);
    expect(resolvePointsToAward(25, 50, true)).toBe(25);
  });

  it('skips daily cap when countTowardDailyLimit is false', () => {
    expect(resolvePointsToAward(30, 200, false)).toBe(30);
  });
});

describe('resolveBasePoints', () => {
  it('prefers the higher of users_points vs users so a zero seed cannot wipe totals', () => {
    expect(resolveBasePoints(0, 500)).toBe(500);
    expect(resolveBasePoints(520, 500)).toBe(520);
    expect(resolveBasePoints(null, 120)).toBe(120);
    expect(resolveBasePoints(undefined, undefined)).toBe(0);
  });
});

describe('getAudioCompetitionAwardPoints', () => {
  it('awards approval points and place bonuses only when approved', () => {
    expect(getAudioCompetitionAwardPoints('pending', null)).toBe(0);
    expect(getAudioCompetitionAwardPoints('rejected', 1)).toBe(0);
    expect(getAudioCompetitionAwardPoints('approved', null)).toBe(AUDIO_COMPETITION_APPROVED_POINTS);
    expect(getAudioCompetitionAwardPoints('approved', 1)).toBe(AUDIO_COMPETITION_APPROVED_POINTS + 75);
    expect(getAudioCompetitionAwardPoints('approved', 2)).toBe(AUDIO_COMPETITION_APPROVED_POINTS + 50);
    expect(getAudioCompetitionAwardPoints('approved', 3)).toBe(AUDIO_COMPETITION_APPROVED_POINTS + 25);
  });
});
