import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

const sanitizeName = (name: string | null | undefined) => {
  const t = String(name || '').trim();
  return t || 'Friend';
};

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(50, Math.min(2000, Number(searchParams.get('limit') || 500)));

    const { data: rows, error } = await supabaseAdmin
      .from('weekly_star_snapshots')
      .select('week_start_date,week_end_date,user_id,active_days,weekly_stars,weekly_points_at_close,monthly_points_at_close,total_points_at_close')
      .order('week_start_date', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          setupRequired: true,
          entries: [],
          message: 'weekly_star_snapshots table is missing',
        });
      }
      throw error;
    }

    const userIds = [...new Set((rows || []).map((r: any) => String(r.user_id || '')).filter(Boolean))];

    const usersRes = userIds.length
      ? await supabaseAdmin.from('users').select('uid,name,email').in('uid', userIds)
      : ({ data: [], error: null } as any);

    if (usersRes.error) throw usersRes.error;

    const userById = new Map<string, { name: string; email: string | null }>();
    for (const row of usersRes.data || []) {
      userById.set(String((row as any).uid), {
        name: sanitizeName((row as any).name),
        email: (row as any).email || null,
      });
    }

    const entries = (rows || []).map((row: any) => {
      const uid = String(row.user_id || '');
      const profile = userById.get(uid);
      return {
        uid,
        name: profile?.name || 'Friend',
        email: profile?.email || null,
        weekStartDate: String(row.week_start_date),
        weekEndDate: String(row.week_end_date),
        activeDays: Number(row.active_days || 0),
        weeklyStars: Number(row.weekly_stars || 0),
        weeklyPoints: Number(row.weekly_points_at_close || 0),
        monthlyPoints: Number(row.monthly_points_at_close || 0),
        totalPoints: Number(row.total_points_at_close || 0),
      };
    });

    return NextResponse.json({ setupRequired: false, entries });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
