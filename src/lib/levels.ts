/**
 * XP levels for the avatar collection.
 * Pure and deterministic so it can be unit-tested and shared on server + client.
 *
 * Thresholds grow as `level(L) = 50 * (L - 1) * L`, so early levels come fast
 * (100, 200, 300, 400 ... points of new XP) and later ones take longer.
 */

export const XP_PER_LEVEL = 50;

/** Cumulative points required to reach a level. Level 1 starts at 0. */
export function pointsForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return XP_PER_LEVEL * (safeLevel - 1) * safeLevel;
}

/** The level a learner is on for a given lifetime points total. */
export function levelFromPoints(points: number): number {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  let level = 1;
  while (pointsForLevel(level + 1) <= safePoints) {
    level += 1;
    if (level >= 1000) break; // safety guard against runaway loops
  }
  return level;
}

/** Friendly level titles, indexed from level 1. */
export const LEVEL_TITLES = [
  'Little Star',
  'Explorer',
  'Seeker',
  'Learner',
  'Scholar',
  'Hafiz-in-training',
  'Quran Champion',
  'Bright Beacon',
  'Guiding Star',
  'Master of Knowledge',
];

/** Title for a level; the last title covers every level beyond the list. */
export function levelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const index = Math.min(safeLevel - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[index] || LEVEL_TITLES[0];
}

export interface LevelProgress {
  level: number;
  /** Total points needed to reach the current level. */
  currentLevelXp: number;
  /** Total points needed to reach the next level. */
  nextLevelXp: number;
  /** Points earned within the current level. */
  xpIntoLevel: number;
  /** Points the current level spans. */
  xpForLevel: number;
  /** xpIntoLevel / xpForLevel, clamped to 0..1. */
  progressRatio: number;
  title: string;
}

/** Everything the UI needs to draw the level badge and XP bar. */
export function levelProgress(points: number): LevelProgress {
  const safePoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const level = levelFromPoints(safePoints);
  const currentLevelXp = pointsForLevel(level);
  const nextLevelXp = pointsForLevel(level + 1);
  const xpForLevel = Math.max(1, nextLevelXp - currentLevelXp);
  const xpIntoLevel = Math.max(0, safePoints - currentLevelXp);
  const progressRatio = Math.min(1, xpIntoLevel / xpForLevel);

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForLevel,
    progressRatio,
    title: levelTitle(level),
  };
}
