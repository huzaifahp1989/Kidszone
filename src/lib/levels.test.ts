import { describe, expect, it } from 'vitest';
import {
  LEVEL_TITLES,
  levelFromPoints,
  levelProgress,
  levelTitle,
  pointsForLevel,
} from '@/lib/levels';

describe('pointsForLevel', () => {
  it('starts at zero and grows with each level', () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(pointsForLevel(2)).toBe(100);
    expect(pointsForLevel(3)).toBe(300);
    expect(pointsForLevel(4)).toBe(600);
    expect(pointsForLevel(5)).toBe(1000);
  });

  it('treats levels below 1 as level 1', () => {
    expect(pointsForLevel(0)).toBe(0);
    expect(pointsForLevel(-4)).toBe(0);
  });
});

describe('levelFromPoints', () => {
  it('maps boundary points to the correct level', () => {
    expect(levelFromPoints(0)).toBe(1);
    expect(levelFromPoints(99)).toBe(1);
    expect(levelFromPoints(100)).toBe(2);
    expect(levelFromPoints(299)).toBe(2);
    expect(levelFromPoints(300)).toBe(3);
    expect(levelFromPoints(599)).toBe(3);
    expect(levelFromPoints(600)).toBe(4);
    expect(levelFromPoints(999)).toBe(4);
    expect(levelFromPoints(1000)).toBe(5);
  });

  it('defaults to level 1 for invalid or negative input', () => {
    expect(levelFromPoints(-50)).toBe(1);
    expect(levelFromPoints(Number.NaN)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('reports 0 progress at the start of a level', () => {
    const progress = levelProgress(100);
    expect(progress.level).toBe(2);
    expect(progress.currentLevelXp).toBe(100);
    expect(progress.nextLevelXp).toBe(300);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.xpForLevel).toBe(200);
    expect(progress.progressRatio).toBe(0);
  });

  it('computes a fractional progress ratio within a level', () => {
    expect(levelProgress(50).progressRatio).toBe(0.5);
    expect(levelProgress(150).progressRatio).toBeCloseTo(0.25, 5);
    expect(levelProgress(299).progressRatio).toBeCloseTo(0.995, 5);
  });

  it('keeps the progress ratio inside 0..1', () => {
    for (const points of [0, 100, 250, 600, 10_000]) {
      const { progressRatio, xpIntoLevel, xpForLevel } = levelProgress(points);
      expect(progressRatio).toBeGreaterThanOrEqual(0);
      expect(progressRatio).toBeLessThanOrEqual(1);
      expect(xpIntoLevel).toBeLessThan(xpForLevel);
    }
  });

  it('handles invalid points as level 1 with no progress', () => {
    const progress = levelProgress(Number.NaN);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.progressRatio).toBe(0);
  });
});

describe('level titles', () => {
  it('maps levels to friendly titles', () => {
    expect(levelTitle(1)).toBe('Little Star');
    expect(levelTitle(2)).toBe('Explorer');
    expect(levelTitle(7)).toBe('Quran Champion');
  });

  it('reuses the final title for levels past the list', () => {
    const last = LEVEL_TITLES[LEVEL_TITLES.length - 1];
    expect(levelTitle(LEVEL_TITLES.length + 20)).toBe(last);
    expect(levelProgress(50_000).title).toBe(last);
  });
});
