import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ACTIVITY_BONUS_POINTS,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
} from '@/lib/points-policy';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';

export const dynamic = 'force-dynamic';

type ActivityRow = { user_id: string; activity_day: string; pts: number };

function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const minWeekly = Number(body?.minWeekly ?? 500);

    const { weekStartIso, weekEndIso, weekStartDate } = getScoreWeekRangeUtc();

    const [quizRes, gamesRes, pledgesRes, stuckRes] = await Promise.all([
      supabaseAdmin
        .from('quiz_attempts')
        .select('user_id, score, max_score, completed_at')
        .gte('completed_at', weekStartIso)
        .lt('completed_at', weekEndIso),
      supabaseAdmin
        .from('game_progress')
        .select('uid, playedat')
        .gte('playedat', weekStartIso)
        .lt('playedat', weekEndIso),
      supabaseAdmin
        .from('pledges')
        .select('user_id, count, created_at')
        .gte('created_at', weekStartIso)
        .lt('created_at', weekEndIso),
      supabaseAdmin
        .from('users_points')
        .select('user_id, weekly_points, total_points, monthly_points')
        .gte('weekly_points', minWeekly),
    ]);

    if (quizRes.error) throw quizRes.error;
    if (gamesRes.error) throw gamesRes.error;
    if (pledgesRes.error) throw pledgesRes.error;
    if (stuckRes.error) throw stuckRes.error;

    const events: ActivityRow[] = [];

    for (const row of quizRes.data || []) {
      const score = Number((row as any).score ?? 0);
      const maxScore = Number((row as any).max_score ?? 0);
      if (maxScore > 0 && score >= maxScore) {
        events.push({
          user_id: String((row as any).user_id),
          activity_day: new Date((row as any).completed_at).toLocaleDateString('en-CA', {
            timeZone: 'Europe/London',
          }),
          pts: QUIZ_POINTS_PER_COMPLETION,
        });
      }
    }

    for (const row of gamesRes.data || []) {
      if (!(row as any).playedat) continue;
      events.push({
        user_id: String((row as any).uid),
        activity_day: new Date((row as any).playedat).toLocaleDateString('en-CA', {
          timeZone: 'Europe/London',
        }),
        pts: ACTIVITY_BONUS_POINTS,
      });
    }

    for (const row of pledgesRes.data || []) {
      if (Number((row as any).count ?? 0) < 5) continue;
      events.push({
        user_id: String((row as any).user_id),
        activity_day: new Date((row as any).created_at).toLocaleDateString('en-CA', {
          timeZone: 'Europe/London',
        }),
        pts: ACTIVITY_BONUS_POINTS,
      });
    }

    const dailyByUser = new Map<string, Map<string, number>>();
    for (const event of events) {
      if (!dailyByUser.has(event.user_id)) {
        dailyByUser.set(event.user_id, new Map());
      }
      const dayMap = dailyByUser.get(event.user_id)!;
      dayMap.set(event.activity_day, (dayMap.get(event.activity_day) || 0) + event.pts);
    }

    const recalculatedWeekly = new Map<string, number>();
    for (const [userId, dayMap] of dailyByUser) {
      let weekTotal = 0;
      for (const dayPts of dayMap.values()) {
        weekTotal += Math.min(POINTS_DAILY_CAP, dayPts);
      }
      recalculatedWeekly.set(userId, weekTotal);
    }

    const stuckRows = stuckRes.data || [];
    const userIds = stuckRows.map((r: any) => String(r.user_id));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('users').select('uid, name, email').in('uid', userIds)
      : { data: [] };
    const profileById = new Map((profiles || []).map((p: any) => [String(p.uid), p]));

    const fixes: Array<{
      userId: string;
      name: string;
      oldWeekly: number;
      newWeekly: number;
      gain: number;
      oldTotal: number;
      newTotal: number;
    }> = [];

    for (const row of stuckRows) {
      const userId = String((row as any).user_id);
      const oldWeekly = Number((row as any).weekly_points ?? 0);
      const oldTotal = Number((row as any).total_points ?? 0);
      const newWeekly = recalculatedWeekly.get(userId) ?? 0;
      if (newWeekly <= oldWeekly) continue;

      const gain = newWeekly - oldWeekly;
      fixes.push({
        userId,
        name: String(profileById.get(userId)?.name || 'Friend'),
        oldWeekly,
        newWeekly,
        gain,
        oldTotal,
        newTotal: oldTotal + gain,
      });
    }

    if (!dryRun && fixes.length > 0) {
      for (const fix of fixes) {
        const row = stuckRows.find((r: any) => String(r.user_id) === fix.userId) as any;
        const oldMonthly = Number(row?.monthly_points ?? 0);
        const newTotal = fix.newTotal;
        const badges = Math.floor(newTotal / 100);
        const level = 1 + Math.floor(badges / 5);

        await supabaseAdmin
          .from('users_points')
          .update({
            weekly_points: fix.newWeekly,
            total_points: newTotal,
            monthly_points: oldMonthly + fix.gain,
            badges,
            level,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', fix.userId);

        await supabaseAdmin
          .from('users')
          .update({
            points: newTotal,
            weeklypoints: fix.newWeekly,
            monthlypoints: oldMonthly + fix.gain,
          })
          .eq('uid', fix.userId);
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      weekStartDate,
      weekStartIso,
      weekEndIso,
      stuckCount: stuckRows.length,
      fixCount: fixes.length,
      fixes,
    });
  } catch (error: any) {
    console.error('[recalc-stuck-weekly-points]', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
