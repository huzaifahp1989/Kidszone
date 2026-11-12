import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type WinnerRow = {
  id: string;
  winner_name: string;
  madrasah_name: string | null;
  week_start_date: string;
  created_at: string;
};

// Best-effort: match each winner's name to a learner account so we can show
// when they last played. Winners that don't match simply have no last-played.
async function attachLastPlayed(winners: WinnerRow[]) {
  const names = [...new Set(winners.map((w) => String(w.winner_name || '').trim()).filter(Boolean))];
  if (names.length === 0) return winners.map((w) => ({ ...w, last_played: null }));

  const lastPlayedByUid = new Map<string, string | null>();
  try {
    const { data: users } = await supabaseAdmin.from('users').select('uid,name').in('name', names);
    const uids = (users || [])
      .map((u: { uid?: string }) => String(u?.uid || ''))
      .filter(Boolean);

    if (uids.length > 0) {
      const { data: points } = await supabaseAdmin
        .from('users_points')
        .select('user_id,last_earned_date')
        .in('user_id', uids);

      for (const row of (points || []) as Array<{ user_id: string; last_earned_date: string | null }>) {
        lastPlayedByUid.set(String(row.user_id), row.last_earned_date || null);
      }
    }

    const uidByName = new Map<string, string>();
    for (const u of (users || []) as Array<{ uid?: string; name?: string }>) {
      const name = String(u?.name || '').trim();
      const uid = String(u?.uid || '');
      if (name && uid && !uidByName.has(name)) uidByName.set(name, uid);
    }

    return winners.map((w) => {
      const uid = uidByName.get(String(w.winner_name || '').trim());
      return { ...w, last_played: uid ? lastPlayedByUid.get(uid) ?? null : null };
    });
  } catch (error) {
    console.warn('Weekly winners last-played lookup failed:', error);
    return winners.map((w) => ({ ...w, last_played: null }));
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('weekly_winner_announcements')
      .select('id, winner_name, madrasah_name, week_start_date, created_at')
      .order('week_start_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ winners: [] });
      }
      throw error;
    }

    const winners = await attachLastPlayed((data || []) as WinnerRow[]);
    return NextResponse.json({ winners });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ winners: [], error: message }, { status: 500 });
  }
}
