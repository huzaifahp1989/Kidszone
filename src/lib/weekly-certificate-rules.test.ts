import { describe, expect, it } from 'vitest';
import {
  chooseWeeklyCertificateAwardees,
  rankWeeklyCandidates,
  type WeeklyCertificateCandidate,
} from '@/lib/weekly-certificate-rules';

function candidate(
  userId: string,
  weeklyScore: number,
  weeklyPoints = 0,
  weeklyActivityCount = 0
): WeeklyCertificateCandidate {
  return {
    userId,
    name: userId,
    weeklyPoints,
    weeklyActivityCount,
    weeklyScore,
    badges: 0,
    level: 1,
  };
}

const defaultOptions = {
  goldCount: 1,
  silverCount: 1,
  bronzeCount: 1,
  participationMax: 100,
};

describe('weekly certificate activity ranking', () => {
  it('ranks unique active days before activity volume or points', () => {
    const ranked = rankWeeklyCandidates([
      candidate('many-points', 3, 500, 20),
      candidate('most-days', 6, 50, 2),
    ]);

    expect(ranked.map(({ userId }) => userId)).toEqual(['most-days', 'many-points']);
  });

  it('shares podium ranks and tiers when learners have the same active-day count', () => {
    const awards = chooseWeeklyCertificateAwardees(
      [
        candidate('gold-a', 7, 100),
        candidate('gold-b', 7, 50),
        candidate('bronze', 5, 100),
        candidate('participation', 3, 100),
      ],
      defaultOptions
    );

    expect(awards.map(({ userId, rank, tier }) => ({ userId, rank, tier }))).toEqual([
      { userId: 'gold-a', rank: 1, tier: 'gold' },
      { userId: 'gold-b', rank: 1, tier: 'gold' },
      { userId: 'bronze', rank: 3, tier: 'bronze' },
      { userId: 'participation', rank: 4, tier: 'participation' },
    ]);
  });

  it('assigns the default gold, silver, and bronze awards to the top three ranks', () => {
    const awards = chooseWeeklyCertificateAwardees(
      [
        candidate('gold', 7),
        candidate('silver', 6),
        candidate('bronze', 5),
        candidate('participation', 4),
      ],
      defaultOptions
    );

    expect(awards.map(({ rank, tier }) => ({ rank, tier }))).toEqual([
      { rank: 1, tier: 'gold' },
      { rank: 2, tier: 'silver' },
      { rank: 3, tier: 'bronze' },
      { rank: 4, tier: 'participation' },
    ]);
  });

  it('does not give podium awards to inactive point earners', () => {
    const awards = chooseWeeklyCertificateAwardees(
      [candidate('inactive', 0, 100)],
      defaultOptions
    );

    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ rank: 1, tier: 'participation' });
  });

  it('keeps participation awards capped and limited to qualifying learners', () => {
    const awards = chooseWeeklyCertificateAwardees(
      [
        candidate('active', 1),
        candidate('qualifier-a', 0, 75),
        candidate('qualifier-b', 0, 0, 2),
        candidate('not-qualified', 0),
      ],
      { ...defaultOptions, goldCount: 0, silverCount: 0, bronzeCount: 0, participationMax: 1 }
    );

    expect(awards.map(({ userId, tier }) => ({ userId, tier }))).toEqual([
      { userId: 'active', tier: 'participation' },
    ]);
  });
});
