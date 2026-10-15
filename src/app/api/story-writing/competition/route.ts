import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { monthKey, previousMonthKey } from '@/lib/story-writing';
import { buildCompetitionResults, ensureCompetitionCycle, isMissingTableError } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Current month standings plus the last finished month (champion, runner up, third place and top 10). */
export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCompetitionCycle();
    const [current, previous] = await Promise.all([
      buildCompetitionResults(monthKey(), user.id),
      buildCompetitionResults(previousMonthKey(), user.id),
    ]);
    return NextResponse.json({ current, previous: previous.status === 'FINALIZED' ? previous : null });
  } catch (error) {
    const missing = isMissingTableError(error as { message?: string; code?: string });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load competition', setupRequired: missing },
      { status: missing ? 503 : 500 }
    );
  }
}
