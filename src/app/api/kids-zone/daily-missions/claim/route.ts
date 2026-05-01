import { NextResponse } from 'next/server';
import { getDailyMissionSnapshot } from '@/lib/kids-zone-missions';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const snapshot = await getDailyMissionSnapshot(userId);
    if (!snapshot.reward.configured) {
      return NextResponse.json({ error: 'Daily mission bonus columns are not set up yet. Run the latest daily tracker SQL update first.' }, { status: 503 });
    }
    if (!snapshot.summary.allCompleted) {
      return NextResponse.json({ error: 'Complete all daily missions before claiming the bonus.' }, { status: 400 });
    }
    if (snapshot.reward.claimed) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        pointsAwarded: snapshot.reward.claimedPoints,
        message: snapshot.reward.claimedPoints > 0
          ? `Mission bonus already claimed. +${snapshot.reward.claimedPoints} points were added earlier.`
          : 'Mission bonus already claimed for today.',
      });
    }

    const claimedAt = new Date().toISOString();
    const { data: lockRow, error: lockError } = await supabaseAdmin
      .from('daily_progress')
      .update({
        mission_bonus_claimed_at: claimedAt,
        mission_bonus_points: 0,
      })
      .eq('user_id', userId)
      .eq('date', snapshot.date)
      .is('mission_bonus_claimed_at', null)
      .select('id')
      .maybeSingle();

    if (lockError) {
      return NextResponse.json({ error: lockError.message }, { status: 500 });
    }

    if (!lockRow) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        pointsAwarded: 0,
        message: 'Mission bonus was already claimed in another session.',
      });
    }

    const awardResult = await awardPointsWithDailyCapByUserId(userId, snapshot.reward.points);

    if (!awardResult.success && awardResult.reason === 'update_failed') {
      await supabaseAdmin
        .from('daily_progress')
        .update({ mission_bonus_claimed_at: null, mission_bonus_points: 0 })
        .eq('user_id', userId)
        .eq('date', snapshot.date);

      return NextResponse.json({ error: awardResult.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('daily_progress')
      .update({ mission_bonus_points: awardResult.pointsAwarded })
      .eq('user_id', userId)
      .eq('date', snapshot.date);

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      pointsAwarded: awardResult.pointsAwarded,
      message: awardResult.message,
      reason: awardResult.reason,
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
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}