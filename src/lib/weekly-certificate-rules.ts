import { WEEKLY_DRAW_MIN_POINTS } from '@/lib/leaderboard-rules';

export type WeeklyCertificateTier = 'gold' | 'silver' | 'bronze' | 'participation';

export type WeeklyCertificateCandidate = {
  userId: string;
  name: string;
  weeklyPoints: number;
  weeklyActivityCount: number;
  weeklyScore: number;
  badges: number;
  level: number;
};

export type WeeklyCertificateAward = WeeklyCertificateCandidate & {
  rank: number;
  tier: WeeklyCertificateTier;
};

export const MIN_WEEKLY_CERTIFICATE_PARTICIPATION_POINTS = Math.max(
  10,
  Math.floor(WEEKLY_DRAW_MIN_POINTS / 2)
);
export const MIN_WEEKLY_CERTIFICATE_PARTICIPATION_ACTIVITY = 2;

export function rankWeeklyCandidates(
  candidates: WeeklyCertificateCandidate[]
): WeeklyCertificateCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.weeklyScore !== a.weeklyScore) return b.weeklyScore - a.weeklyScore;
    if (b.weeklyActivityCount !== a.weeklyActivityCount) {
      return b.weeklyActivityCount - a.weeklyActivityCount;
    }
    if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
    return a.name.localeCompare(b.name);
  });
}

function tierForRank(
  rank: number,
  goldCount: number,
  silverCount: number,
  bronzeCount: number
): WeeklyCertificateTier {
  if (rank <= goldCount) return 'gold';
  if (rank <= goldCount + silverCount) return 'silver';
  if (rank <= goldCount + silverCount + bronzeCount) return 'bronze';
  return 'participation';
}

export function chooseWeeklyCertificateAwardees(
  candidates: WeeklyCertificateCandidate[],
  options: {
    goldCount: number;
    silverCount: number;
    bronzeCount: number;
    participationMax: number;
  }
): WeeklyCertificateAward[] {
  const ranked = rankWeeklyCandidates(candidates);
  const awards: WeeklyCertificateAward[] = [];
  let previousScore: number | null = null;
  let previousRank = 0;
  let participationCount = 0;

  ranked.forEach((candidate, index) => {
    if (candidate.weeklyScore !== previousScore) {
      previousScore = candidate.weeklyScore;
      previousRank = index + 1;
    }

    const rank = previousRank;
    const tier =
      candidate.weeklyScore > 0
        ? tierForRank(rank, options.goldCount, options.silverCount, options.bronzeCount)
        : 'participation';
    const qualifiesForParticipation =
      candidate.weeklyPoints >= MIN_WEEKLY_CERTIFICATE_PARTICIPATION_POINTS ||
      candidate.weeklyActivityCount >= MIN_WEEKLY_CERTIFICATE_PARTICIPATION_ACTIVITY ||
      candidate.weeklyScore >= 1;

    if (tier === 'participation') {
      if (!qualifiesForParticipation || participationCount >= options.participationMax) return;
      participationCount += 1;
    }

    awards.push({ ...candidate, rank, tier });
  });

  return awards;
}
