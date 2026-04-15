import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined, uid?: string | null) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  if (uid && t === uid) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
  if (isUuid) return 'Friend';
  return t;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tab = (url.searchParams.get('tab') || 'monthly').toLowerCase();
    const isMonthly = tab === 'monthly';
    
    // Order by the appropriate field based on tab
    const orderField = isMonthly ? 'monthly_points' : 'weekly_points';

    const { data, error } = await supabaseAdmin
      .from('users_points')
      .select('user_id,total_points,weekly_points,monthly_points,badges,level,users(name,points,weeklypoints,monthlypoints)')
      .gt(orderField, 0)  // Only get users with points in this period
      .order(orderField, { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      console.error('Leaderboard API error:', error);
      return NextResponse.json({ entries: [], lastWinner: null, error: error.message }, { status: 500 });
    }

    const entries = (data || []).map((row: any) => {
      const displayName = sanitizeName(row.users?.name, row.user_id);
      const totalPoints = Number(row.total_points ?? row.users?.points ?? 0);
      const weeklyPoints = Number(row.weekly_points ?? row.users?.weeklypoints ?? 0);
      const monthlyPoints = Number(row.monthly_points ?? row.users?.monthlypoints ?? 0);
      
      // Use the appropriate points for display
      const displayPoints = isMonthly ? monthlyPoints : weeklyPoints;

      return {
        uid: row.user_id,
        name: displayName,
        level: row.level ?? 1,
        points: totalPoints,
        weeklyPoints,
        monthlyPoints,
        badges: row.badges ?? 0,
      };
    });

    const { data: winnerData } = await supabaseAdmin
      .from('weekly_winners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastWinner: any = null;
    if (winnerData?.user_id) {
      const { data: userData } = await supabaseAdmin.from('users').select('name').eq('uid', winnerData.user_id).maybeSingle();
      const winnerName = sanitizeName(userData?.name, winnerData.user_id) || 'Champion';
      lastWinner = {
        uid: winnerData.user_id,
        name: winnerName,
        level: winnerData.level ?? 1,
        points: winnerData.weekly_points ?? 0,
        badges: winnerData.badges ?? 0,
      };
    }

    const res = NextResponse.json({ entries, lastWinner, error: null });
    // Always serve fresh leaderboard data
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (e: any) {
    console.error('Leaderboard API exception:', e);
    return NextResponse.json({ entries: [], lastWinner: null, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
