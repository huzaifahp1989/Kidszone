import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeUserId } from '@/lib/test-mode-server';
import { MAX_DAILY_QUIZ_ATTEMPTS } from '@/lib/points-policy';
import { requireMatchingUser } from '@/lib/request-auth';

function getUtcDayWindow() {
  const now = new Date();
  const dayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  const nextDayStart = new Date(dayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

  return {
    dayStartIso: dayStart.toISOString(),
    nextDayStartIso: nextDayStart.toISOString(),
    nextDayStartMs: nextDayStart.getTime(),
  };
}

/**
 * GET /api/quiz/daily/lock-status?userId=xxx
 * Returns whether the user has used both quiz attempts for today.
 * Cross-device: purely based on the DB record, not localStorage.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId') || '';

  if (!userIdParam) {
    return NextResponse.json({ locked: false, lockedUntil: null, attemptsToday: 0, maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS });
  }

  const auth = await requireMatchingUser(req, userIdParam);
  if (!auth.ok) return auth.response;

  const userId = auth.userId;

  if (await isTestModeUserId(userId)) {
    return NextResponse.json({ locked: false, lockedUntil: null, attemptsToday: 0, maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS, testMode: true });
  }

  const { dayStartIso, nextDayStartIso, nextDayStartMs } = getUtcDayWindow();

  const { data, count, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('score, completed_at', { count: 'exact' })
    .eq('user_id', userId)
    .gte('completed_at', dayStartIso)
    .lt('completed_at', nextDayStartIso)
    .order('completed_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('lock-status error:', error);
    // On error, don't block the user
    return NextResponse.json({ locked: false, lockedUntil: null, attemptsToday: 0, maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS });
  }

  const attemptsToday = Number(count || 0);
  const lastScore = Array.isArray(data) && data[0] ? Number((data[0] as any).score ?? 0) : null;

  return NextResponse.json({
    locked: attemptsToday >= MAX_DAILY_QUIZ_ATTEMPTS,
    lockedUntil: attemptsToday >= MAX_DAILY_QUIZ_ATTEMPTS ? nextDayStartMs : null,
    lastScore,
    attemptsToday,
    maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS,
  });
}
