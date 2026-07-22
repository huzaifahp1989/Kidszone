import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';
import { DAILY_STEP_ACTIVITY_TABLE, isMissingTableError, serverToday } from '@/lib/fitness-server';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined, uid?: string | null) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  if (uid && t === uid) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
  return isUuid ? 'Friend' : t;
};

function ageGroupOf(age: number | null): string {
  if (age == null) return 'All ages';
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  return '11-14';
}

function periodStart(period: string, today: string): string | null {
  if (period === 'daily') return today;
  if (period === 'weekly') {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  if (period === 'monthly') return `${today.slice(0, 7)}-01`;
  return null; // all-time
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || 'daily').toLowerCase();
  const ageGroupFilter = searchParams.get('ageGroup') || '';
  const cityFilter = (searchParams.get('city') || '').trim().toLowerCase();

  const today = serverToday();
  const start = periodStart(period, today);

  let query = supabaseAdmin
    .from(DAILY_STEP_ACTIVITY_TABLE)
    .select('user_id, steps, minutes, points_awarded, activity_day')
    .limit(10000);
  if (start) query = query.gte('activity_day', start);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ entries: [], tableMissing: true });
    return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
  }

  const agg = new Map<string, { steps: number; minutes: number; points: number }>();
  for (const r of (data || []) as Array<Record<string, unknown>>) {
    const uid = String(r.user_id);
    const cur = agg.get(uid) || { steps: 0, minutes: 0, points: 0 };
    cur.steps += Number(r.steps ?? 0);
    cur.minutes += Number(r.minutes ?? 0);
    cur.points += Number(r.points_awarded ?? 0);
    agg.set(uid, cur);
  }

  const userIds = [...agg.keys()];
  if (!userIds.length) return NextResponse.json({ entries: [] });

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('uid, name, email, age, city')
    .in('uid', userIds.slice(0, 1000));
  const byUid = new Map<string, Record<string, unknown>>();
  for (const u of users || []) byUid.set(String((u as Record<string, unknown>).uid), u as Record<string, unknown>);

  // Count fitness badges per user (optional display).
  const { data: badgeRows } = await supabaseAdmin
    .from('fitness_badges')
    .select('user_id')
    .in('user_id', userIds.slice(0, 1000));
  const badgeCount = new Map<string, number>();
  for (const b of badgeRows || []) {
    const uid = String((b as Record<string, unknown>).user_id);
    badgeCount.set(uid, (badgeCount.get(uid) || 0) + 1);
  }

  let entries = userIds
    .map((uid) => {
      const u = byUid.get(uid) || {};
      const age = u.age != null ? Number(u.age) : null;
      const totals = agg.get(uid)!;
      return {
        uid,
        name: sanitizeName(u.name as string | null, uid),
        email: (u.email as string | null) || '',
        age,
        ageGroup: ageGroupOf(age),
        city: (u.city as string | null) || '',
        steps: totals.steps,
        minutes: totals.minutes,
        points: totals.points,
        badges: badgeCount.get(uid) || 0,
      };
    })
    .filter((e) => !isTestModeEmail(e.email) && e.steps > 0);

  if (ageGroupFilter && ageGroupFilter !== 'All ages') {
    entries = entries.filter((e) => e.ageGroup === ageGroupFilter);
  }
  if (cityFilter) {
    entries = entries.filter((e) => e.city.toLowerCase().includes(cityFilter));
  }

  entries.sort((a, b) => b.steps - a.steps || b.points - a.points);
  const ranked = entries.slice(0, 100).map((e, i) => ({
    rank: i + 1,
    uid: e.uid,
    name: e.name,
    ageGroup: e.ageGroup,
    city: e.city,
    steps: e.steps,
    minutes: e.minutes,
    points: e.points,
    badges: e.badges,
  }));

  const res = NextResponse.json({ entries: ranked });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
