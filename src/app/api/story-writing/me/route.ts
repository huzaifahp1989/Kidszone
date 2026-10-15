import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { monthKey, monthRange } from '@/lib/story-writing';

export const dynamic = 'force-dynamic';

/** The child's story points, existing Kids Zone total, badges and notification history. */
export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureUserRecords(user.id);

  const { start, end } = monthRange(monthKey());
  const [points, totals, badges, notifications] = await Promise.all([
    supabaseAdmin.from('story_points').select('points, created_at').eq('user_id', user.id),
    supabaseAdmin.from('users_points').select('total_points').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin.from('story_badges').select('badge_key, awarded_at').eq('user_id', user.id),
    supabaseAdmin
      .from('story_notifications')
      .select('id, type, title, body, story_id, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (points.error) {
    return NextResponse.json({ error: points.error.message, setupRequired: true }, { status: 503 });
  }

  const rows = points.data || [];
  const sum = (list: typeof rows) => list.reduce((total, row) => total + (Number(row.points) || 0), 0);
  const thisMonth = rows.filter((row) => {
    const at = new Date(String(row.created_at));
    return at >= start && at < end;
  });

  return NextResponse.json({
    storyPoints: sum(rows),
    storyPointsThisMonth: sum(thisMonth),
    storiesApproved: rows.filter((row) => Number(row.points) > 0).length,
    totalKidsZonePoints: Number(totals.data?.total_points) || 0,
    badges: (badges.data || []).map((row) => ({ key: row.badge_key, awardedAt: row.awarded_at })),
    notifications: notifications.data || [],
    unreadCount: (notifications.data || []).filter((row) => !row.read_at).length,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabaseAdmin
    .from('story_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  return NextResponse.json({ ok: true });
}
