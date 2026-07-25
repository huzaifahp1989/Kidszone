import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

const POINTS_PER_RECORDING = RECORDING_APPROVED_POINTS;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const storyId = typeof body?.storyId === 'string' ? body.storyId.trim() : '';

    if (!userId || !storyId) {
      return NextResponse.json({ error: 'userId and storyId are required' }, { status: 400 });
    }

    const { data: existingSameWeek, error: existingError } = await supabaseAdmin
      .from('recordings')
      .select('id')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .gte('created_at', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    if (Array.isArray(existingSameWeek) && existingSameWeek.length > 0) {
      return NextResponse.json({ ok: true, alreadyRecorded: true, pointsAwarded: 0 });
    }

    const { error: recordingError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId,
        story_id: storyId,
        audio_path: `external/${userId}/${Date.now()}`,
        duration: 0,
        status: 'approved',
      });

    if (recordingError) {
      throw recordingError;
    }

    // Always award through the shared server-points path so daily cap, monthly
    // reset, and users/users_points sync stay consistent with quiz/games awards.
    const award = await awardPointsWithDailyCapByUserId(userId, POINTS_PER_RECORDING, {
      successMessage: `Recording saved. +${POINTS_PER_RECORDING} points added.`,
    });

    if (!award.success && award.reason === 'update_failed') {
      return NextResponse.json(
        {
          ok: false,
          error: award.message || 'Recording saved but points could not be updated.',
          pointsAwarded: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      pointsAwarded: award.pointsAwarded,
      totalPoints: award.totalPoints,
      weeklyPoints: award.weeklyPoints,
      monthlyPoints: award.monthlyPoints,
      todayPoints: award.todayPoints,
      reason: award.reason,
      message: award.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
