const LEVEL_TITLES = [
  'Beginner',
  'Star Learner',
  'Young Scholar',
  'Knowledge Seeker',
  'Hafiz Helper',
  'Golden Learner',
  'Islamic Champion',
  'Master Scholar',
];

export function parseLevelNumber(level: string | number | undefined | null): number {
  if (typeof level === 'number' && Number.isFinite(level)) {
    return Math.max(1, Math.floor(level));
  }
  const text = String(level || '').trim();
  const match = text.match(/\d+/);
  if (match) return Math.max(1, parseInt(match[0], 10));
  return 1;
}

export function getKidLevelTitle(level: string | number | undefined | null): string {
  const n = parseLevelNumber(level);
  const index = Math.min(n - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[index] || LEVEL_TITLES[0];
}
