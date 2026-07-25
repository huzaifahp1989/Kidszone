import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  POINTS_DAILY_CAP,
  resolveBasePoints,
  resolveTodayPoints,
} from '@/lib/points-policy';
import { apiCorsHeaders } from '@/lib/quiz-cors';

export const dynamic = 'force-dynamic';

function json(req: Request, body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: apiCorsHeaders(req, 'GET, OPTIONS'),
  });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: apiCorsHeaders(req, 'GET, OPTIONS'),
  });
}

/**
 * Authoritative points snapshot via service role.
 * The browser anon client often cannot read users_points (RLS / Cap session),
 * so the navbar must refresh through this endpoint after awards.
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedRequestUser(req);
    if (!user) {
      return json(req, { error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserRecords(user.id);

    const [{ data: pointsRow }, { data: userRow }] = await Promise.all([
      supabaseAdmin
        .from('users_points')
        .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('users')
        .select('uid, name, email, age, points, weeklypoints, monthlypoints, role, city, streak')
        .eq('uid', user.id)
        .maybeSingle(),
    ]);

    if (!userRow && !pointsRow) {
      return json(req, { error: 'Profile not found' }, { status: 404 });
    }

    const points = resolveBasePoints(pointsRow?.total_points, userRow?.points);
    const weeklyPoints = resolveBasePoints(pointsRow?.weekly_points, userRow?.weeklypoints);
    const monthlyPoints = resolveBasePoints(pointsRow?.monthly_points, userRow?.monthlypoints);
    const todayPoints = resolveTodayPoints(pointsRow?.today_points, pointsRow?.last_earned_date);
    const badges = Number(pointsRow?.badges ?? Math.floor(points / 100));
    const levelNum = Number(pointsRow?.level ?? 1 + Math.floor(badges / 5));

    return json(req, {
      ok: true,
      profile: {
        uid: user.id,
        name: userRow?.name || 'Friend',
        // Prefer auth email — users.email can still be a stale user-xxx@local placeholder.
        email: user.email || userRow?.email || '',
        age: typeof userRow?.age === 'number' ? userRow.age : Number(userRow?.age) || 0,
        role: userRow?.role || 'kid',
        city: userRow?.city ? String(userRow.city) : undefined,
        streak: Number(userRow?.streak || 0),
        points,
        weeklyPoints,
        monthlyPoints,
        todayPoints,
        dailyLimit: POINTS_DAILY_CAP,
        badges,
        level: `Level ${levelNum}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return json(req, { error: message }, { status: 500 });
  }
}
