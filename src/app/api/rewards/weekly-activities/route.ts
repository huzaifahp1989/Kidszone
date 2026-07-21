import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isEligibleForWeeklyDraw } from '@/lib/leaderboard-rules';
import {
  getCurrentWeekRangeUtc,
  getWeeklyActivityCountsForUsers,
} from '@/lib/weekly-activity';

export const dynamic = 'force-dynamic';

type WeeklyActivitySummary = {
  quizCount: number;
  gameCount: number;
  pledgeCount: number;
  recordingCount: number;
};

async function getWeeklyActivitySummary(userId: string): Promise<WeeklyActivitySummary> {
  const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();
  const counts = await getWeeklyActivityCountsForUsers([userId], weekStartIso, weekEndIso);
  const summary = counts.get(userId) || {
    quizCount: 0,
    gameCount: 0,
    pledgeCount: 0,
    recordingCount: 0,
    totalCount: 0,
  };

  return {
    quizCount: summary.quizCount,
    gameCount: summary.gameCount,
    pledgeCount: summary.pledgeCount,
    recordingCount: summary.recordingCount,
  };
}

function buildWeeklyChallenge(summary: WeeklyActivitySummary, weeklyPoints = 0) {
  const totalActivities =
    summary.quizCount + summary.gameCount + summary.pledgeCount + summary.recordingCount;
  const challengeTarget = 5;
  const completedTowardChallenge = Math.min(challengeTarget, totalActivities);

  return {
    activities: {
      quiz: summary.quizCount,
      game: summary.gameCount,
      pledge: summary.pledgeCount,
      recording: summary.recordingCount,
    },
    completed: totalActivities,
    completedTowardChallenge,
    total: challengeTarget,
    remaining: Math.max(0, challengeTarget - completedTowardChallenge),
    qualifiedForDraw: isEligibleForWeeklyDraw(weeklyPoints),
    weeklyPoints,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();
    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('weekly_points')
      .eq('user_id', userId)
      .maybeSingle();

    const weeklyPoints = Number(pointsRow?.weekly_points || 0);
    const summary = await getWeeklyActivitySummary(userId);
    const challenge = buildWeeklyChallenge(summary, weeklyPoints);

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
