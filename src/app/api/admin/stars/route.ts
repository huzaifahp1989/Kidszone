import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';
import { getWeeklyScoresForUsers } from '@/lib/weekly-score';
import {
  getWeeklyStarsFromActiveDays,
  MAX_WEEKLY_STARS,
  WEEKLY_STAR_DAY_THRESHOLDS,
} from '@/lib/leaderboard-rules';

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
    const limit = Math.max(25, Math.min(1000, Number(searchParams.get('limit') || 300)));

    const { weekStartIso, weekEndIso, weekStartDate, weekEndDate } = getScoreWeekRangeUtc();

    const { data: pointsRows, error: pointsErr } = await supabaseAdmin
      .from('users_points')
      .select('user_id,total_points,weekly_points,monthly_points')
      .order('monthly_points', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (pointsErr) {
      throw pointsErr;
    }

    const userIds = (pointsRows || []).map((row: any) => String(row.user_id || '')).filter(Boolean);

    const [weeklyScores, usersRes] = await Promise.all([
      getWeeklyScoresForUsers(userIds, weekStartIso, weekEndIso),
      userIds.length
        ? supabaseAdmin.from('users').select('uid,name,email').in('uid', userIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (usersRes.error) {
      throw usersRes.error;
    }

    const userById = new Map<string, { name: string; email: string | null }>();
    for (const row of usersRes.data || []) {
      userById.set(String((row as any).uid), {
        name: sanitizeName((row as any).name),
        email: (row as any).email || null,
      });
    }

    const entries = (pointsRows || []).map((row: any) => {
      const uid = String(row.user_id || '');
      const activeDays = Number(weeklyScores.get(uid) || 0);
      const weeklyStars = getWeeklyStarsFromActiveDays(activeDays);
      const profile = userById.get(uid);

      return {
        uid,
        name: profile?.name || 'Friend',
        email: profile?.email || null,
        activeDays,
        weeklyStars,
        maxWeeklyStars: MAX_WEEKLY_STARS,
        weeklyPoints: Number(row.weekly_points || 0),
        monthlyPoints: Number(row.monthly_points || 0),
        totalPoints: Number(row.total_points || 0),
      };
    });

    entries.sort((a, b) => {
      if (b.weeklyStars !== a.weeklyStars) return b.weeklyStars - a.weeklyStars;
      if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
      if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      week: { weekStartDate, weekEndDate },
      thresholds: [...WEEKLY_STAR_DAY_THRESHOLDS],
      maxWeeklyStars: MAX_WEEKLY_STARS,
      entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
