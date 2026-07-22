import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { isTestModeEmail } from '@/lib/test-mode';
import {
  MAX_DAILY_STEPS,
  SUSPICIOUS_DAILY_STEPS,
  estimateDistanceMetres,
  estimateCalories,
  estimateMinutes,
  goalMet as isGoalMet,
  earnedAchievementKeys,
  computeStreak,
} from '@/lib/fitness';
import {
  DAILY_STEP_ACTIVITY_TABLE,
  FITNESS_BADGES_TABLE,
  getActiveChallenge,
  getFitnessStatus,
  isMissingTableError,
  serverToday,
} from '@/lib/fitness-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      /* allow empty body (status refresh) */
    }

    // Server-authoritative day — the client CANNOT set the date (anti time-cheat).
    const today = serverToday();
    const source = String(body.source || 'unknown').toLowerCase();
    const submittedSteps = Math.max(0, Math.round(Number(body.steps ?? 0)) || 0);
    const submittedMinutes = Math.max(0, Math.round(Number(body.minutes ?? 0)) || 0);

    // Existing activity for today (steps only ever increase during the day).
    const { data: existing, error: readErr } = await supabaseAdmin
      .from(DAILY_STEP_ACTIVITY_TABLE)
      .select('*')
      .eq('user_id', user.id)
      .eq('activity_day', today)
      .maybeSingle();
    if (readErr && !isMissingTableError(readErr)) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }
    if (isMissingTableError(readErr)) {
      return NextResponse.json({ error: 'Fitness challenge is not set up yet.' }, { status: 503 });
    }

    const prevSteps = Number((existing as Record<string, unknown> | null)?.steps ?? 0);
    const prevMinutes = Number((existing as Record<string, unknown> | null)?.minutes ?? 0);
    const alreadyAwarded = Boolean((existing as Record<string, unknown> | null)?.goal_met);
    const prevPoints = Number((existing as Record<string, unknown> | null)?.points_awarded ?? 0);

    // Steps can only go up; clamp to a plausible daily max and flag suspicious spikes.
    let steps = Math.max(prevSteps, submittedSteps);
    let flagged = Boolean((existing as Record<string, unknown> | null)?.flagged);
    if (steps > MAX_DAILY_STEPS) {
      steps = MAX_DAILY_STEPS;
      flagged = true;
    } else if (steps >= SUSPICIOUS_DAILY_STEPS) {
      flagged = true;
    }
    const minutes = Math.max(prevMinutes, submittedMinutes || estimateMinutes(steps));
    const distanceM = estimateDistanceMetres(steps);
    const calories = estimateCalories(steps);

    const challenge = await getActiveChallenge();
    const met = challenge ? isGoalMet(challenge, { steps, minutes }) : false;

    // Award challenge points once per day (only when newly met, not flagged, not test account).
    let pointsAwarded = prevPoints;
    let newlyAwardedPoints = 0;
    const isTest = isTestModeEmail(user.email);
    if (challenge && met && !alreadyAwarded && !flagged && !isTest) {
      await ensureUserRecords(user.id);
      const award = await awardPointsWithDailyCapByUserId(user.id, challenge.points, {
        successMessage: `Walking challenge complete! +${challenge.points} points.`,
        countTowardDailyLimit: false,
        knownIsTestMode: false,
        skipEnsureUserRecords: true,
      });
      if (award.success && award.pointsAwarded > 0) {
        newlyAwardedPoints = award.pointsAwarded;
        pointsAwarded = challenge.points;
      }
    }

    const payload = {
      user_id: user.id,
      activity_day: today,
      steps,
      minutes,
      distance_m: distanceM,
      calories,
      source,
      challenge_id: challenge?.id ?? null,
      goal_met: met || alreadyAwarded,
      points_awarded: pointsAwarded,
      flagged,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from(DAILY_STEP_ACTIVITY_TABLE)
      .upsert(payload, { onConflict: 'user_id,activity_day' });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Recompute achievements and award any newly earned fitness badges.
    const { data: allRows } = await supabaseAdmin
      .from(DAILY_STEP_ACTIVITY_TABLE)
      .select('activity_day, steps, goal_met')
      .eq('user_id', user.id)
      .order('activity_day', { ascending: false })
      .limit(400);
    const rows = (allRows || []) as Array<Record<string, unknown>>;
    const lifetimeSteps = rows.reduce((sum, r) => sum + Number(r.steps ?? 0), 0);
    const goalDays = rows.filter((r) => Boolean(r.goal_met)).map((r) => String(r.activity_day));
    const bestStreak = computeStreak(goalDays, today);
    const earned = earnedAchievementKeys(lifetimeSteps, bestStreak);

    const newBadges: string[] = [];
    if (earned.length) {
      const { data: haveRows } = await supabaseAdmin
        .from(FITNESS_BADGES_TABLE)
        .select('badge_key')
        .eq('user_id', user.id);
      const have = new Set((haveRows || []).map((b) => String((b as Record<string, unknown>).badge_key)));
      const missing = earned.filter((k) => !have.has(k));
      if (missing.length) {
        await supabaseAdmin.from(FITNESS_BADGES_TABLE).insert(missing.map((k) => ({ user_id: user.id, badge_key: k })));
        newBadges.push(...missing);
      }
    }

    const status = await getFitnessStatus(user.id);
    return NextResponse.json({
      success: true,
      goalMet: met,
      newlyAwardedPoints,
      newBadges,
      flagged,
      status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
