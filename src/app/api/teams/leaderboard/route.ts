import { NextResponse } from 'next/server';
import { getTeamLeaderboard, type TeamTab } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawTab = (url.searchParams.get('tab') || 'weekly').toLowerCase();
    const tab: TeamTab = rawTab === 'monthly' ? 'monthly' : rawTab === 'lifetime' ? 'lifetime' : 'weekly';

    const teams = await getTeamLeaderboard(tab);

    const res = NextResponse.json({ ok: true, teams, tab });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[teams/leaderboard GET]', message);
    return NextResponse.json({ ok: false, teams: [], error: message }, { status: 500 });
  }
}
