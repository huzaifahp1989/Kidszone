import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';
import { apiCorsHeaders } from '@/lib/quiz-cors';

function getWeekStartUtcDateString() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  ));
  return weekStart.toISOString().slice(0, 10);
}

function buildMessage(missing: string[]) {
  if (missing.length === 0) return 'You have entered this week\'s competition draw. Good luck!';
  if (missing.length === 1) return `1 left to enter the competition draw. Next: ${missing[0]}.`;
  return `${missing.length} left to enter the competition draw. Next: ${missing.join(' and ')}.`;
}

function json(req: Request, body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: apiCorsHeaders(req, 'GET, POST, OPTIONS'),
  });
}

function withCors(req: Request, response: NextResponse) {
  const headers = apiCorsHeaders(req, 'GET, POST, OPTIONS');
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: apiCorsHeaders(req, 'GET, POST, OPTIONS'),
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await requireMatchingUser(req, searchParams.get('userId') || '');
    if (!auth.ok) return withCors(req, auth.response);

    const { userId } = auth;

    const weekStart = getWeekStartUtcDateString();
    const { data: existing, error: readErr } = await supabaseAdmin
      .from('weekly_competition_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (readErr) {
      if (readErr.code === '42P01') {
        return json(req, { setupRequired: true, completedCount: 0, remainingCount: 3, missing: ['Daily Quiz', 'Play a game', 'Pledge Durood'] });
      }
      throw readErr;
    }

    const didQuiz = Boolean((existing as { did_quiz?: boolean })?.did_quiz);
    const didGame = Boolean((existing as { did_game?: boolean })?.did_game);
    const didPledge = Boolean((existing as { did_pledge?: boolean })?.did_pledge);
    const missing: string[] = [];
    if (!didQuiz) missing.push('Daily Quiz');
    if (!didGame) missing.push('Play a game');
    if (!didPledge) missing.push('Pledge Durood');

    return json(req, {
      weekStart,
      didQuiz,
      didGame,
      didPledge,
      completedCount: (didQuiz ? 1 : 0) + (didGame ? 1 : 0) + (didPledge ? 1 : 0),
      remainingCount: missing.length,
      entered: missing.length === 0,
      missing,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return json(req, { error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return withCors(req, auth.response);

    const { userId } = auth;
    const activity = typeof body?.activity === 'string' ? body.activity : '';

    if (!['quiz', 'pledge', 'game'].includes(activity)) {
      return json(req, { error: 'activity must be quiz, pledge, or game' }, { status: 400 });
    }

    const weekStart = getWeekStartUtcDateString();

    const { data: existing, error: readErr } = await supabaseAdmin
      .from('weekly_competition_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (readErr) {
      if (readErr.code === '42P01') {
        return json(req, {
          success: false,
          setupRequired: true,
          message:
            'Competition tracking is not set up yet. Admin must run the Supabase migration 20260510_create_weekly_competition_progress.sql.',
        });
      }
      throw readErr;
    }

    const next = {
      user_id: userId,
      week_start: weekStart,
      did_quiz: Boolean((existing as any)?.did_quiz),
      did_pledge: Boolean((existing as any)?.did_pledge),
      did_game: Boolean((existing as any)?.did_game),
      completed_at: (existing as any)?.completed_at ?? null,
      updated_at: new Date().toISOString(),
    };

    if (activity === 'quiz') next.did_quiz = true;
    if (activity === 'pledge') next.did_pledge = true;
    if (activity === 'game') next.did_game = true;

    const entered = next.did_quiz && next.did_pledge && next.did_game;
    if (entered && !next.completed_at) next.completed_at = new Date().toISOString();

    const { error: upsertErr } = await supabaseAdmin
      .from('weekly_competition_progress')
      .upsert(next, { onConflict: 'user_id,week_start' });

    if (upsertErr) throw upsertErr;

    const missing: string[] = [];
    if (!next.did_quiz) missing.push('Daily Quiz');
    if (!next.did_game) missing.push('Play a game');
    if (!next.did_pledge) missing.push('Pledge Durood');

    return json(req, {
      success: true,
      weekStart,
      didQuiz: next.did_quiz,
      didGame: next.did_game,
      didPledge: next.did_pledge,
      completedCount: (next.did_quiz ? 1 : 0) + (next.did_game ? 1 : 0) + (next.did_pledge ? 1 : 0),
      remainingCount: missing.length,
      entered,
      message: buildMessage(missing),
    });
  } catch (error: any) {
    return json(req, { error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
