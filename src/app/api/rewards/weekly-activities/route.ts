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

const DEFAULT_MILESTONE_THRESHOLD = 3;
const DEFAULT_MILESTONE_BONUS = 30;

async function getMilestoneConfig() {
  let data: { key: string; value: string | number }[] | null = null;
  try {
    const res = await supabaseAdmin
      .from('points_config')
      .select('key, value')
      .in('key', ['milestone_threshold', 'milestone_bonus']);
    data = res.data;
  } catch {
    data = null;
  }
  const map = new Map<string, number>();
  for (const row of data || []) {
    map.set(row.key, Number(row.value));
  }
  return {
    threshold: map.get('milestone_threshold') ?? DEFAULT_MILESTONE_THRESHOLD,
    bonus: map.get('milestone_bonus') ?? DEFAULT_MILESTONE_BONUS,
  };
}

function getWeekKey(): string {
  const { weekStartIso } = getCurrentWeekRangeUtc();
  const d = new Date(weekStartIso);
  const year = d.getUTCFullYear();
  const onejan = new Date(Date.UTC(year, 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

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

    const milestoneConfig = await getMilestoneConfig();
    const weekKey = getWeekKey();
    const reached = challenge.completed >= milestoneConfig.threshold;

    const { data: claimRow } = await supabaseAdmin
      .from('weekly_milestone_claims')
      .select('points_awarded, claimed_at')
      .eq('user_id', userId)
      .eq('week_key', weekKey)
      .maybeSingle();

    const claimed = Boolean(claimRow);

    return NextResponse.json({
      ...challenge,
      counts: summary,
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      milestone: {
        threshold: milestoneConfig.threshold,
        bonusPoints: milestoneConfig.bonus,
        completed: challenge.completed,
        reached,
        claimable: reached && !claimed,
        claimed,
        claimedPoints: claimRow ? Number(claimRow.points_awarded) : 0,
        message: claimed
          ? claimRow && claimRow.points_awarded > 0
            ? `Great work! You've completed ${milestoneConfig.threshold} activities this week. Bonus already claimed (+${claimRow.points_awarded} pts).`
            : `Great work! You've completed ${milestoneConfig.threshold} activities this week. Bonus already claimed.`
          : reached
            ? `Great work! You've completed ${milestoneConfig.threshold} activities this week. Claim your +${milestoneConfig.bonus} bonus!`
            : `Complete ${milestoneConfig.threshold - challenge.completed} more activit${milestoneConfig.threshold - challenge.completed === 1 ? 'y' : 'ies'} to unlock the +${milestoneConfig.bonus} milestone bonus.`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

