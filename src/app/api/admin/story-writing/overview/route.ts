import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { monthKey } from '@/lib/story-writing';
import {
  buildCompetitionResults,
  buildStoryLeaderboard,
  ensureCompetitionCycle,
  isMissingTableError,
  loadChildInfo,
} from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Dashboard counters, monthly competition standings, points transactions and badge holders. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureCompetitionCycle();
  } catch (error) {
    const e = error as { message?: string; code?: string };
    if (isMissingTableError(e)) return NextResponse.json({ error: e.message, setupRequired: true }, { status: 503 });
  }

  const count = async (status: string) => {
    const { count: n } = await supabaseAdmin
      .from('story_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    return n ?? 0;
  };

  const [pending, approved, rejected, changes, competition, leaderboard, tx, badges] = await Promise.all([
    count('PENDING'),
    count('APPROVED'),
    count('REJECTED'),
    count('CHANGES_REQUESTED'),
    buildCompetitionResults(monthKey(), null),
    buildStoryLeaderboard('all', null, 20),
    supabaseAdmin
      .from('story_points')
      .select('id, user_id, story_id, points, reason, created_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    supabaseAdmin.from('story_badges').select('user_id, badge_key, awarded_at').order('awarded_at', { ascending: false }).limit(200),
  ]);

  const userIds = Array.from(
    new Set([...(tx.data || []), ...(badges.data || [])].map((row) => String(row.user_id)))
  );
  const info = await loadChildInfo(userIds);
  const name = (id: unknown) => info.get(String(id))?.displayName ?? 'Young Writer';

  return NextResponse.json({
    counts: { pending, approved, rejected, changesRequested: changes },
    competition,
    leaderboard: leaderboard.entries,
    transactions: (tx.data || []).map((row) => ({ ...row, displayName: name(row.user_id) })),
    badges: (badges.data || []).map((row) => ({ ...row, displayName: name(row.user_id) })),
  });
}
