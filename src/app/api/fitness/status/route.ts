import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { getFitnessStatus } from '@/lib/fitness-server';
import { FITNESS_ACHIEVEMENTS, earnedAchievementKeys } from '@/lib/fitness';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  try {
    const status = await getFitnessStatus(user.id);
    if ('tableMissing' in status) {
      return NextResponse.json({ tableMissing: true });
    }

    const earned = new Set(earnedAchievementKeys(status.lifetimeSteps, status.currentStreak));
    const achievements = FITNESS_ACHIEVEMENTS.map((a) => ({
      key: a.key,
      label: a.label,
      emoji: a.emoji,
      earned: earned.has(a.key) || status.badges.includes(a.key),
    }));

    return NextResponse.json({ ...status, achievements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
