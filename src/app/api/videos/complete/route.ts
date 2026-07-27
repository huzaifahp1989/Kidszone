import { NextResponse } from 'next/server';
import { requireMatchingUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';
import { repairUserPointsByUserId } from '@/lib/points-repair';

export const dynamic = 'force-dynamic';

function isMissingVideoTablesError(message: string) {
  const m = message.toLowerCase();
  const mentionsVideoTables = m.includes('video_watch_logs') || m.includes('learning_videos');
  const isMissingTable = m.includes('schema cache') || m.includes('relation') || m.includes('does not exist');
  return mentionsVideoTables && isMissingTable;
}

function getUtcTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const videoId = String(body?.videoId || '').trim();
    const watchedSeconds = Number(body?.watchedSeconds ?? 0);

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const { data: video, error: videoError } = await supabaseAdmin
      .from('learning_videos')
      .select('id, title, points_reward, duration_seconds, is_active')
      .eq('id', videoId)
      .maybeSingle();

    if (videoError) throw videoError;
    if (!video || !video.is_active) {
      return NextResponse.json({ error: 'Video not found or inactive' }, { status: 404 });
    }

    const today = getUtcTodayDateString();

    const { data: alreadyLogged, error: checkError } = await supabaseAdmin
      .from('video_watch_logs')
      .select('id, awarded_points')
      .eq('user_id', auth.userId)
      .eq('video_id', videoId)
      .eq('watch_date', today)
      .maybeSingle();

    if (checkError) throw checkError;

    if (alreadyLogged) {
      return NextResponse.json({
        success: true,
        pointsAwarded: 0,
        message: 'You already earned points for this video today.',
      });
    }

    const requiredSeconds = Number(video.duration_seconds || 0);
    if (requiredSeconds > 0) {
      const minimum = Math.max(5, Math.floor(requiredSeconds * 0.9));
      if (!Number.isFinite(watchedSeconds) || watchedSeconds < minimum) {
        return NextResponse.json({
          error: `Keep watching to the end to earn points.`,
          requiredSeconds: minimum,
          watchedSeconds,
        }, { status: 400 });
      }
    }

    const reward = Math.max(0, Math.min(200, Number(video.points_reward || 25)));
    const award = await awardPointsWithDailyCapByUserId(auth.userId, reward, {
      countTowardDailyLimit: true,
      successMessage: `Great job! +${reward} points for completing this video.`,
    });

    const awardedPoints = Number(award.pointsAwarded || 0);

    const { error: insertLogError } = await supabaseAdmin
      .from('video_watch_logs')
      .insert({
        user_id: auth.userId,
        video_id: videoId,
        watch_date: today,
        watched_seconds: Number.isFinite(watchedSeconds) ? Math.floor(watchedSeconds) : null,
        awarded_points: awardedPoints,
      });

    if (insertLogError) {
      if (insertLogError.code === '23505') {
        return NextResponse.json({
          success: true,
          pointsAwarded: 0,
          message: 'You already earned points for this video today.',
        });
      }
      throw insertLogError;
    }

    if (awardedPoints > 0) {
      await supabaseAdmin.from('game_progress').insert({
        uid: auth.userId,
        gameid: `activity-video-${videoId}`,
        points: awardedPoints,
        playedat: new Date().toISOString(),
      });
    }

    try {
      await repairUserPointsByUserId(auth.userId, { backfillToday: true });
    } catch (repairErr: any) {
      console.warn('[videos/complete] post-award repair warning:', repairErr?.message || repairErr);
    }

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', auth.userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      pointsAwarded: awardedPoints,
      message:
        awardedPoints > 0
          ? award.message || `+${awardedPoints} points awarded.`
          : award.message || 'Video completed. Daily points cap may be reached.',
      profile: {
        points: Number(pointsRow?.total_points ?? 0),
        weeklyPoints: Number(pointsRow?.weekly_points ?? 0),
        monthlyPoints: Number(pointsRow?.monthly_points ?? 0),
        todayPoints: Number(pointsRow?.today_points ?? 0),
      },
    });
  } catch (error: any) {
    console.error('[videos/complete] error:', error);
    if (isMissingVideoTablesError(String(error?.message || ''))) {
      return NextResponse.json(
        {
          error:
            'Missing videos tables. Apply migration supabase/migrations/20260727_learning_videos_and_watch_logs.sql to create learning_videos and video_watch_logs.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
