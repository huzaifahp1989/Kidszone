import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let scope: 'monthly' | 'all' = 'all';
    try {
      const body = await request.json();
      if (body?.scope === 'monthly') scope = 'monthly';
      if (body?.scope === 'all') scope = 'all';
    } catch {}

    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    const pointsUpdate =
      scope === 'monthly'
        ? ({ monthly_points: 0, updated_at: nowIso } as any)
        : ({
            total_points: 0,
            weekly_points: 0,
            monthly_points: 0,
            today_points: 0,
            last_earned_date: today,
            updated_at: nowIso,
          } as any);

    const { data: upData, error: upErr } = await supabaseAdmin
      .from('users_points')
      .update(pointsUpdate)
      .gt('total_points', -1)
      .select('user_id');

    if (upErr) throw upErr;

    const usersUpdate =
      scope === 'monthly'
        ? ({ monthlypoints: 0 } as any)
        : ({ points: 0, weeklypoints: 0, monthlypoints: 0 } as any);

    const { data: usersData, error: usersErr } = await supabaseAdmin
      .from('users')
      .update(usersUpdate)
      .gt('points', -1)
      .select('uid');

    if (usersErr) {
      // Non-fatal: some schemas may not have these columns
      console.warn('users table reset warning:', usersErr.message);
    }

    return NextResponse.json({
      success: true,
      users_points_updated: upData?.length ?? 0,
      users_updated: usersData?.length ?? 0,
      message: scope === 'monthly' ? 'Monthly points reset to 0' : 'All points reset to 0',
    });
  } catch (e: any) {
    console.error('Reset points error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
