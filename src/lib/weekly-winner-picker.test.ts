import { describe, expect, it } from 'vitest';
import {
  AUTO_WEEKLY_WINNER_COUNT,
  computeCandidateWeight,
  pickWeightedWinners,
} from '@/lib/weekly-winner-picker';

describe('computeCandidateWeight', () => {
  it('uses equal base weight and only penalises recent winners', () => {
    const fresh = computeCandidateWeight({
      wonRecently: false,
      wonBefore: false,
    });

    const recentWinner = computeCandidateWeight({
      wonRecently: true,
      wonBefore: true,
    });

    const pastWinner = computeCandidateWeight({
      wonRecently: false,
      wonBefore: true,
    });

    expect(fresh).toBe(1);
    expect(recentWinner).toBeLessThan(fresh * 0.5);
    expect(pastWinner).toBeLessThan(fresh);
    expect(pastWinner).toBeGreaterThan(recentWinner);
  });
});

describe('pickWeightedWinners', () => {
  const pool = [
    { userId: 'a', weight: 10 },
    { userId: 'b', weight: 1 },
    { userId: 'c', weight: 1 },
    { userId: 'd', weight: 1 },
  ];

  it('is deterministic for the same seed', () => {
    const first = pickWeightedWinners(pool, 2, 'week-2026-07-05');
    const second = pickWeightedWinners(pool, 2, 'week-2026-07-05');
    expect(first.map((w) => w.userId)).toEqual(second.map((w) => w.userId));
  });

  it('never picks the same user twice in one run', () => {
    const picked = pickWeightedWinners(pool, AUTO_WEEKLY_WINNER_COUNT, 'seed-xyz');
    const ids = picked.map((w) => w.userId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
