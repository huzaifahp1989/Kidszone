import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { getCurrentWeekRangeUtc, getWeeklyActivityCountsForUsers } from '@/lib/weekly-activity';

export const dynamic = 'force-dynamic';

const DEFAULT_MILESTONE_THRESHOLD = 3;
const DEFAULT_MILESTONE_BONUS = 30;

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;
    const { userId } = auth;

    const config = await getMilestoneConfig();
    const weekKey = getWeekKey();
    const { weekStartIso, weekEndIso } = getCurrentWeekRangeUtc();

    const counts = await getWeeklyActivityCountsForUsers([userId], weekStartIso, weekEndIso);
    const summary = counts.get(userId);
    const total =
      (summary?.quizCount || 0) +
      (summary?.gameCount || 0) +
      (summary?.pledgeCount || 0) +
      (summary?.recordingCount || 0);

    if (total < config.threshold) {
      return NextResponse.json(
        {
          error: `Complete ${config.threshold} activities this week before claiming the milestone bonus. You have ${total}.`,
        },
        { status: 400 }
      );
    }

    // Atomic insert — unique (user_id, week_key) prevents duplicate claims.
    const { data: claimRow, error: insertError } = await supabaseAdmin
      .from('weekly_milestone_claims')
      .insert({
        user_id: userId,
        week_key: weekKey,
        threshold: config.threshold,
        points_awarded: 0,
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      // Unique violation → already claimed this week.
      if (String(insertError.code || '').includes('23505')) {
        return NextResponse.json({
          success: true,
          alreadyClaimed: true,
          pointsAwarded: 0,
          message: "You've already claimed this week's milestone bonus.",
        });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (!claimRow) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        pointsAwarded: 0,
        message: "You've already claimed this week's milestone bonus.",
      });
    }

    const awardResult = await awardPointsWithDailyCapByUserId(userId, config.bonus);

    if (awardResult.pointsAwarded <= 0) {
      // Daily cap reached or no award — release the claim so they can retry later.
      await supabaseAdmin
        .from('weekly_milestone_claims')
        .delete()
        .eq('id', claimRow.id);
      return NextResponse.json({
        success: false,
        alreadyClaimed: false,
        pointsAwarded: 0,
        message:
          awardResult.reason === 'daily_limit_reached'
            ? `You've reached today's point limit. Come back tomorrow to claim the milestone bonus.`
            : awardResult.message || 'Could not claim the milestone bonus right now.',
        reason: awardResult.reason,
      });
    }

    await supabaseAdmin
      .from('weekly_milestone_claims')
      .update({ points_awarded: awardResult.pointsAwarded })
      .eq('id', claimRow.id);

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      pointsAwarded: awardResult.pointsAwarded,
      message: `Great work! You've completed ${config.threshold} activities this week. +${awardResult.pointsAwarded} points bonus!`,
      totals: {
        totalPoints: awardResult.totalPoints,
        weeklyPoints: awardResult.weeklyPoints,
        monthlyPoints: awardResult.monthlyPoints,
        todayPoints: awardResult.todayPoints,
        badges: awardResult.badges,
        level: awardResult.level,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
