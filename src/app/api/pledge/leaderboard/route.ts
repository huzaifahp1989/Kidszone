import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type PledgeType = 'durood' | 'zikr';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type');
    const type: PledgeType = typeParam === 'zikr' ? 'zikr' : 'durood';

    const { data: pledges, error: pledgeError } = await supabaseAdmin
      .from('pledges')
      .select('user_id, count')
      .eq('type', type);

    if (pledgeError) {
      console.error('[pledge/leaderboard] pledge fetch error:', pledgeError);
      return NextResponse.json({ success: false, leaders: [], error: pledgeError.message }, { status: 500 });
    }

    const countsByUser: Record<string, number> = {};
    for (const row of pledges || []) {
      const uid = String(row.user_id);
      countsByUser[uid] = (countsByUser[uid] || 0) + Number(row.count || 0);
    }

    const userIds = Object.keys(countsByUser);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, leaders: [] });
    }

    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, name, email')
      .in('uid', userIds);

    if (userError) {
      console.error('[pledge/leaderboard] users fetch error:', userError);
    }

    const userMap = new Map<string, string>();
    for (const u of users || []) {
      let displayName = u.name as string | null;
      if (
        !displayName ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayName)
      ) {
        if (u.email && String(u.email).includes('@')) {
          displayName = String(u.email).split('@')[0];
        } else {
          displayName = 'Friend';
        }
      }
      userMap.set(String(u.uid), displayName);
    }

    const leaders = userIds
      .map((uid) => ({
        userId: uid,
        name: userMap.get(uid) || 'Friend',
        count: countsByUser[uid],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return NextResponse.json({ success: true, leaders });
  } catch (err: any) {
    console.error('[pledge/leaderboard] unexpected error:', err);
    return NextResponse.json(
      { success: false, leaders: [], error: err?.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}
