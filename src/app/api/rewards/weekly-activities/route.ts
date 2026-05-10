import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function getCurrentWeekRangeUtc() {
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

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  return { weekStartIso: weekStart.toISOString(), weekEndIso: weekEnd.toISOString() };
}

type WeeklyActivitySummary = {
  quizCount: number;
  gameCount: number;
  pledgeCount: number;
  recordingCount: number;
};

async function getWeeklyActivitySummary(userId: string): Promise<WeeklyActivitySummary> {
  const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();

  const [quizRes, gameRes, pledgeRes, recordingRes] = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso),
    supabaseAdmin
      .from('game_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('played_at', weekStartIso)
      .lt('played_at', weekEndIso),
    supabaseAdmin
      .from('pledges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
    supabaseAdmin
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStartIso)
      .lt('created_at', weekEndIso),
  ]);

  if (quizRes.error) throw new Error(quizRes.error.message);
  if (gameRes.error) throw new Error(gameRes.error.message);
  if (pledgeRes.error) throw new Error(pledgeRes.error.message);
  if (recordingRes.error) throw new Error(recordingRes.error.message);

  return {
    quizCount: Number(quizRes.count || 0),
    gameCount: Number(gameRes.count || 0),
    pledgeCount: Number(pledgeRes.count || 0),
    recordingCount: Number(recordingRes.count || 0),
  };
}

function buildWeeklyChallenge(summary: WeeklyActivitySummary) {
  const total = 5;
  const completed = Math.min(
    total,
    summary.quizCount + summary.gameCount + summary.pledgeCount + summary.recordingCount
  );

  return {
    activities: {
      quiz: summary.quizCount,
      game: summary.gameCount,
      pledge: summary.pledgeCount,
      recording: summary.recordingCount,
    },
    completed,
    total,
    remaining: Math.max(0, total - completed),
    qualifiedForDraw: completed >= total,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const summary = await getWeeklyActivitySummary(userId);
    const challenge = buildWeeklyChallenge(summary);
    const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();

    return NextResponse.json({
      ...challenge,
      counts: summary,
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}