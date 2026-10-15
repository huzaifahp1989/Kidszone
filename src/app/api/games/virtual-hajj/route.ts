import { NextResponse } from 'next/server';
import { getPointsConfigValue } from '@/lib/points-config';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { readAuthoritativePointsSnapshot } from '@/lib/server-points';
import {
  getVirtualHajjChallengeKey,
  getVirtualHajjQuestions,
  gradeVirtualHajjAnswers,
  VIRTUAL_HAJJ_MAX_DAILY_ATTEMPTS,
  VIRTUAL_HAJJ_REWARD_POINTS,
} from '@/lib/virtual-hajj-challenges';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId') || '';
    const auth = await requireMatchingUser(request, userId);
    if (!auth.ok) {
      return json({ error: 'Unable to load the challenge. Please sign in again.' }, auth.response.status);
    }

    const now = new Date();
    const challengeKey = getVirtualHajjChallengeKey(now);
    const challengeDate = challengeKey.slice('tawaf-knowledge-'.length);
    const challengeDay = new Date(`${challengeDate}T00:00:00.000Z`);
    const [attemptsResult, claimResult, levelResult, achievementsResult, profile] = await Promise.all([
      supabaseAdmin
        .from('virtual_hajj_challenge_attempts')
        .select('attempts_used')
        .eq('user_id', auth.userId)
        .eq('challenge_date', challengeDate)
        .maybeSingle(),
      supabaseAdmin
        .from('virtual_hajj_challenge_claims')
        .select('points_awarded')
        .eq('user_id', auth.userId)
        .eq('challenge_key', challengeKey)
        .maybeSingle(),
      supabaseAdmin
        .from('virtual_hajj_level_progress')
        .select('level_id, unlocked_at, completed_at')
        .eq('user_id', auth.userId),
      supabaseAdmin
        .from('virtual_hajj_achievements')
        .select('achievement_id')
        .eq('user_id', auth.userId)
        .eq('achievement_id', 'tawaf-learner')
        .maybeSingle(),
      readAuthoritativePointsSnapshot(auth.userId),
    ]);

    for (const result of [attemptsResult, claimResult, levelResult, achievementsResult]) {
      if (result.error) {
        console.error('[games/virtual-hajj] challenge state read failed:', result.error.message);
        return json({ error: 'Challenge progress could not be loaded. Please try again.' }, 500);
      }
    }

    const levels = levelResult.data || [];
    const attemptsUsed = attemptsResult.data?.attempts_used ?? 0;
    const completed = Boolean(claimResult.data);
    const safaMarwah = levels.find((level) => level.level_id === 'safa-marwah-learning');

    return json({
      ok: true,
      challengeKey,
      challengeDate,
      questions: getVirtualHajjQuestions(challengeDay),
      attemptsUsed,
      attemptsRemaining: Math.max(0, VIRTUAL_HAJJ_MAX_DAILY_ATTEMPTS - attemptsUsed),
      completed,
      pointsAwarded: claimResult.data?.points_awarded ?? 0,
      nextLevelUnlocked: Boolean(safaMarwah?.unlocked_at),
      achievementUnlocked: Boolean(achievementsResult.data),
      profile: profile.hasReliableTotals
        ? {
            totalPoints: profile.totalPoints,
            weeklyPoints: profile.weeklyPoints,
            monthlyPoints: profile.monthlyPoints,
            todayPoints: profile.todayPoints,
          }
        : null,
    });
  } catch (error) {
    console.error('[games/virtual-hajj] failed to load challenge:', error);
    return json({ error: 'Challenge progress could not be loaded. Please try again.' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) {
      return json({ error: 'Unable to submit the challenge. Please sign in again.' }, auth.response.status);
    }

    const ensured = await ensureUserRecords(auth.userId);
    if (!ensured.ok) {
      console.error('[games/virtual-hajj] could not prepare user points:', ensured.error);
      return json({ error: 'Your account could not be prepared to save points. Please try again.' }, 500);
    }

    const now = new Date();
    const challengeKey = getVirtualHajjChallengeKey(now);
    if (body?.challengeKey !== challengeKey) {
      return json({ error: 'This daily challenge has expired. Reload the page to get today’s challenge.' }, 400);
    }

    const grade = gradeVirtualHajjAnswers(body?.answers, now);
    if (!grade.valid) {
      return json({ error: 'Please answer every question before submitting.' }, 400);
    }

    const configuredPoints = await getPointsConfigValue('game_activity');
    const points = Math.min(
      200,
      Math.max(0, Number.isFinite(configuredPoints) ? configuredPoints : VIRTUAL_HAJJ_REWARD_POINTS)
    );

    const { data, error } = await supabaseAdmin.rpc('submit_virtual_hajj_challenge', {
      p_user_id: auth.userId,
      p_challenge_key: challengeKey,
      p_is_correct: grade.correct,
      p_points: points,
    });

    if (error) {
      console.error('[games/virtual-hajj] challenge submission failed:', error.message);
      return json({ error: 'Your challenge could not be saved. Please try again.' }, 500);
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      console.error('[games/virtual-hajj] challenge submission returned no result');
      return json({ error: 'Your challenge could not be saved. Please try again.' }, 500);
    }

    return json({
      ok: result.success,
      correct: result.correct,
      alreadyCompleted: result.already_completed,
      attemptsUsed: result.attempts_used,
      attemptsRemaining: result.attempts_remaining,
      pointsAwarded: result.points_awarded,
      dailyLimit: result.daily_limit,
      nextLevelUnlocked: result.next_level_unlocked,
      achievementUnlocked: Boolean(result.achievement_unlocked),
      profile:
        result.total_points == null
          ? null
          : {
              totalPoints: result.total_points,
              weeklyPoints: result.weekly_points,
              monthlyPoints: result.monthly_points,
              todayPoints: result.today_points,
            },
    });
  } catch (error) {
    console.error('[games/virtual-hajj] unexpected submission error:', error);
    return json({ error: 'Your challenge could not be saved. Please try again.' }, 500);
  }
}
