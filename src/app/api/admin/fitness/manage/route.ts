import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { DAILY_STEP_ACTIVITY_TABLE, FITNESS_BADGES_TABLE, isMissingTableError, serverToday } from '@/lib/fitness-server';

export const dynamic = 'force-dynamic';

// GET: participation stats, or CSV export of the daily leaderboard.
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const today = serverToday();

    const { data, error } = await supabaseAdmin
      .from(DAILY_STEP_ACTIVITY_TABLE)
      .select('user_id, steps, minutes, points_awarded, activity_day, flagged')
      .limit(20000);
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json({ tableMissing: true });
      throw error;
    }
    const rows = (data || []) as Array<Record<string, unknown>>;

    if (searchParams.get('export') === 'csv') {
      const perUser = new Map<string, { steps: number; minutes: number; points: number }>();
      for (const r of rows) {
        const uid = String(r.user_id);
        const cur = perUser.get(uid) || { steps: 0, minutes: 0, points: 0 };
        cur.steps += Number(r.steps ?? 0);
        cur.minutes += Number(r.minutes ?? 0);
        cur.points += Number(r.points_awarded ?? 0);
        perUser.set(uid, cur);
      }
      const uids = [...perUser.keys()];
      const { data: users } = await supabaseAdmin.from('users').select('uid, name, email, age, city').in('uid', uids.slice(0, 2000));
      const byUid = new Map<string, Record<string, unknown>>();
      for (const u of users || []) byUid.set(String((u as Record<string, unknown>).uid), u as Record<string, unknown>);
      const header = ['Name', 'Email', 'Age', 'City', 'Total steps', 'Total minutes', 'Total points'];
      const lines = uids.map((uid) => {
        const u = byUid.get(uid) || {};
        const t = perUser.get(uid)!;
        return [u.name || '', u.email || '', u.age ?? '', u.city || '', t.steps, t.minutes, t.points]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      });
      const csv = [header.join(','), ...lines].join('\n');
      return new NextResponse(csv, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="fitness-leaderboard.csv"' },
      });
    }

    const participants = new Set(rows.map((r) => String(r.user_id)));
    const todayRows = rows.filter((r) => String(r.activity_day) === today);
    const activeToday = new Set(todayRows.map((r) => String(r.user_id)));
    const stepsToday = todayRows.reduce((s, r) => s + Number(r.steps ?? 0), 0);
    const goalsMetToday = todayRows.filter((r) => Number(r.points_awarded ?? 0) > 0).length;
    const flagged = rows.filter((r) => Boolean(r.flagged)).length;
    const totalSteps = rows.reduce((s, r) => s + Number(r.steps ?? 0), 0);

    return NextResponse.json({
      stats: {
        totalParticipants: participants.size,
        activeToday: activeToday.size,
        stepsToday,
        goalsMetToday,
        flaggedDays: flagged,
        totalStepsAllTime: totalSteps,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

// POST: reset competition, or award manual bonus points.
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'reset') {
      // Clear all step activity + fitness badges (a fresh competition).
      await supabaseAdmin.from(DAILY_STEP_ACTIVITY_TABLE).delete().not('id', 'is', null);
      await supabaseAdmin.from(FITNESS_BADGES_TABLE).delete().not('id', 'is', null);
      return NextResponse.json({ success: true, message: 'Fitness competition reset.' });
    }

    if (action === 'bonus') {
      const userId = String(body.userId || '').trim();
      const points = Math.max(1, Math.min(1000, Number(body.points) || 0));
      if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      await ensureUserRecords(userId);
      const award = await awardPointsWithDailyCapByUserId(userId, points, {
        successMessage: `+${points} bonus fitness points!`,
        countTowardDailyLimit: false,
        skipEnsureUserRecords: true,
      });
      return NextResponse.json({ success: award.success, awarded: award.pointsAwarded, message: award.message });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
