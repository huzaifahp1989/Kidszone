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
export type KidRank = {
  title: string;
  emoji: string;
  minimumPoints: number;
  nextMinimumPoints: number | null;
  pointsToNext: number;
  progressPercent: number;
};

export const KID_RANKS = [
  { title: 'Beginner', emoji: '🌱', minimumPoints: 0 },
  { title: 'Star Learner', emoji: '⭐', minimumPoints: 100 },
  { title: 'Young Scholar', emoji: '📚', minimumPoints: 250 },
  { title: 'Knowledge Seeker', emoji: '🔎', minimumPoints: 500 },
  { title: 'Hafiz Helper', emoji: '📖', minimumPoints: 1_000 },
  { title: 'Golden Learner', emoji: '🏅', minimumPoints: 2_000 },
  { title: 'Islamic Champion', emoji: '🏆', minimumPoints: 3_500 },
  { title: 'Master Scholar', emoji: '👑', minimumPoints: 5_000 },
] as const;

export function getKidRank(points: number | null | undefined): KidRank {
  const safePoints = Math.max(0, Number(points) || 0);
  let rankIndex = 0;

  for (let index = 1; index < KID_RANKS.length; index += 1) {
    if (safePoints >= KID_RANKS[index].minimumPoints) rankIndex = index;
  }

  const rank = KID_RANKS[rankIndex];
  const next = KID_RANKS[rankIndex + 1];
  const span = next ? next.minimumPoints - rank.minimumPoints : 1;
  const progressPercent = next
    ? Math.min(100, Math.round(((safePoints - rank.minimumPoints) / span) * 100))
    : 100;

  return {
    ...rank,
    nextMinimumPoints: next?.minimumPoints ?? null,
    pointsToNext: next ? Math.max(0, next.minimumPoints - safePoints) : 0,
    progressPercent,
  };
}

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
