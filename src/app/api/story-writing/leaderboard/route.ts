import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isLeaderboardPeriod } from '@/lib/story-writing';
import { buildStoryLeaderboard, ensureCompetitionCycle, isMissingTableError } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requested = new URL(request.url).searchParams.get('period');
  const period = isLeaderboardPeriod(requested) ? requested : 'month';

  try {
    await ensureCompetitionCycle();
    return NextResponse.json(await buildStoryLeaderboard(period, user.id));
  } catch (error) {
    const missing = isMissingTableError(error as { message?: string; code?: string });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load leaderboard', setupRequired: missing },
      { status: missing ? 503 : 500 }
    );
  }
}
