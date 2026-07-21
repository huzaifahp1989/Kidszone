import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isEligibleForWeeklyDraw, WEEKLY_DRAW_MIN_POINTS } from '@/lib/leaderboard-rules';

export const dynamic = 'force-dynamic';

const INACTIVE_DAYS = 7;

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoffIso = `${daysAgoKey(INACTIVE_DAYS)}T00:00:00.000Z`;

    const [usersRes, pointsRes, quizRes, gamesRes, recordingsRes] = await Promise.all([
      supabaseAdmin.from('users').select('uid, name, email, family_email, madrasahname, level').order('name'),
      supabaseAdmin.from('users_points').select('user_id, weekly_points, today_points, monthly_points'),
      supabaseAdmin.from('quiz_attempts').select('user_id, completed_at').gte('completed_at', cutoffIso),
      supabaseAdmin.from('game_progress').select('uid, playedat').gte('playedat', cutoffIso),
      supabaseAdmin
        .from('recordings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (pointsRes.error) throw pointsRes.error;

    const pointsByUser = new Map<string, { weekly: number; today: number; monthly: number }>();
    for (const row of pointsRes.data || []) {
      const uid = String((row as { user_id: string }).user_id);
      pointsByUser.set(uid, {
        weekly: Number((row as { weekly_points: number }).weekly_points ?? 0),
        today: Number((row as { today_points: number }).today_points ?? 0),
        monthly: Number((row as { monthly_points: number }).monthly_points ?? 0),
      });
    }

    const activeUsers = new Set<string>();
    for (const row of quizRes.data || []) {
      activeUsers.add(String((row as { user_id: string }).user_id));
    }
    for (const row of gamesRes.data || []) {
      activeUsers.add(String((row as { uid: string }).uid));
    }

    const inactiveUsers: Array<{
      uid: string;
      name: string;
      email: string;
      weeklyPoints: number;
    }> = [];

    const drawEligible: Array<{
      uid: string;
      name: string;
      email: string;
      weeklyPoints: number;
    }> = [];

    const almostEligible: Array<{
      uid: string;
      name: string;
      email: string;
      weeklyPoints: number;
      pointsNeeded: number;
    }> = [];

    for (const user of usersRes.data || []) {
      const uid = String((user as { uid: string }).uid);
      const name = String((user as { name: string }).name || 'Friend');
      const email = String((user as { email: string }).email || '');
      const pts = pointsByUser.get(uid)?.weekly ?? 0;

      if (!activeUsers.has(uid)) {
        inactiveUsers.push({ uid, name, email, weeklyPoints: pts });
      }

      if (isEligibleForWeeklyDraw(pts)) {
        drawEligible.push({ uid, name, email, weeklyPoints: pts });
      } else if (pts > 0 && pts <= WEEKLY_DRAW_MIN_POINTS) {
        almostEligible.push({
          uid,
          name,
          email,
          weeklyPoints: pts,
          pointsNeeded: WEEKLY_DRAW_MIN_POINTS + 1 - pts,
        });
      }
    }

    inactiveUsers.sort((a, b) => a.name.localeCompare(b.name));
    drawEligible.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    almostEligible.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    return NextResponse.json({
      summary: {
        totalUsers: (usersRes.data || []).length,
        inactiveCount: inactiveUsers.length,
        drawEligibleCount: drawEligible.length,
        almostEligibleCount: almostEligible.length,
        pendingRecordings: Number(recordingsRes.count ?? 0),
        inactiveDays: INACTIVE_DAYS,
        drawMinPoints: WEEKLY_DRAW_MIN_POINTS,
      },
      inactiveUsers,
      drawEligible,
      almostEligible,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
