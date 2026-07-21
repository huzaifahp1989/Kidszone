import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { tryAwardDailyActivity } from '@/lib/daily-activity-award';
import { ACTIVITY_BONUS_POINTS, MAX_DAILY_GAME_COMPLETIONS } from '@/lib/points-policy';
import { canEarnActivityPoints } from '@/lib/daily-activity-limits';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const gameId = String(body?.gameId || '').trim();
    const gameTitle = String(body?.gameTitle || gameId || 'Game').trim();
    const difficulty = String(body?.difficulty || 'medium');
    const tasksPlayed = Number(body?.tasksPlayed ?? 0);
    const awardPoints = body?.awardPoints !== false;

    if (!gameId) {
      return NextResponse.json({ error: 'userId and gameId are required' }, { status: 400 });
    }

    await ensureUserRecords(userId);

    let pointsAwarded = 0;
    let message = '';
    let activityLimitReached = false;
    let gamesUsedToday = 0;
    let gamesRemaining = MAX_DAILY_GAME_COMPLETIONS;

    if (awardPoints) {
      const gate = await canEarnActivityPoints(userId, 'game');
      gamesUsedToday = gate.used;
      gamesRemaining = Math.max(0, gate.limit - gate.used);
      if (!gate.allowed) {
        activityLimitReached = true;
        message = gate.message || `You have already earned points for ${MAX_DAILY_GAME_COMPLETIONS} games today.`;
      } else {
        const award = await tryAwardDailyActivity(userId, 'game', {
          successMessage: `+${ACTIVITY_BONUS_POINTS} points for finishing ${gameTitle}!`,
        });
        pointsAwarded = award.pointsAwarded;
        message = award.message;
        if (award.reason === 'activity_limit') {
          activityLimitReached = true;
        }
      }
    }

    // Unique per session so replaying the same game type still records a second daily earn.
    const sessionGameId = `${gameId}#${randomUUID()}`;
    const payload = {
      uid: userId,
      gameid: sessionGameId,
      points: pointsAwarded,
      playedat: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('game_progress').insert(payload);

    if (error && error.code !== '42P01') {
      console.warn('[games/track] game_progress insert failed:', error.message);
    }

    if (awardPoints) {
      const afterGate = await canEarnActivityPoints(userId, 'game');
      gamesUsedToday = afterGate.used;
      gamesRemaining = Math.max(0, afterGate.limit - afterGate.used);
    }

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      pointsAwarded,
      message,
      activityLimitReached,
      gamesUsedToday,
      gamesRemaining,
      maxDailyGames: MAX_DAILY_GAME_COMPLETIONS,
      pointsPerGame: ACTIVITY_BONUS_POINTS,
      profile: {
        points: Number(pointsRow?.total_points ?? 0),
        weeklyPoints: Number(pointsRow?.weekly_points ?? 0),
        monthlyPoints: Number(pointsRow?.monthly_points ?? 0),
        todayPoints: Number(pointsRow?.today_points ?? 0),
      },
      warning: error && error.code !== '42P01' ? error.message : undefined,
      gameTitle,
      difficulty,
      tasksPlayed: Number.isFinite(tasksPlayed) ? tasksPlayed : undefined,
    });
  } catch (error: any) {
    console.error('[games/track] unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
