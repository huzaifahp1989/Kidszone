import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

const FEEDBACK_POINTS = 30;

// Use a unique game_id in game_activity_logs to track whether the user has
// already claimed the feedback reward for a given platform. This prevents
// duplicate awards across sessions/devices without needing a new table.
function feedbackGameId(platform: string) {
  return `feedback-review-${platform}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, platform } = body || {};

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json({ error: 'platform must be "ios" or "android"' }, { status: 400 });
    }

    const gameId = feedbackGameId(platform);
    const platformLabel = platform === 'ios' ? 'App Store' : 'Google Play';

    // Check if user has already claimed this platform's reward.
    const { count, error: checkError } = await supabaseAdmin
      .from('game_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (checkError) {
      // If the table doesn't exist yet, fall through and still award points.
      console.warn('game_activity_logs check error:', checkError.message);
    } else if (Number(count || 0) > 0) {
      return NextResponse.json(
        { error: `You have already claimed the ${platformLabel} review reward.`, alreadyClaimed: true },
        { status: 409 }
      );
    }

    // Award 30 bonus points, bypassing the quiz daily cap.
    const result = await awardPointsWithDailyCapByUserId(userId, FEEDBACK_POINTS, {
      countTowardDailyLimit: false,
      successMessage: `+${FEEDBACK_POINTS} points for leaving a ${platformLabel} review!`,
    });

    if (!result.success && result.reason !== 'test_mode') {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // Record the claim so it can't be repeated.
    await supabaseAdmin.from('game_activity_logs').insert({
      user_id: userId,
      game_id: gameId,
      game_title: `${platformLabel} Review Reward`,
      points_earned: result.pointsAwarded,
      played_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      pointsAwarded: result.pointsAwarded,
      message: result.message || `+${FEEDBACK_POINTS} points awarded for your ${platformLabel} review!`,
      totalPoints: result.totalPoints,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
