import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

function isMissingVideoTablesError(message: string) {
  const m = message.toLowerCase();
  const mentionsVideoTables = m.includes('video_watch_logs') || m.includes('learning_videos');
  const isMissingTable = m.includes('schema cache') || m.includes('relation') || m.includes('does not exist');
  return mentionsVideoTables && isMissingTable;
}

function toSafeVideo(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    source_type: String(row.source_type || 'youtube'),
    video_url: String(row.video_url || ''),
    youtube_video_id: row.youtube_video_id ? String(row.youtube_video_id) : null,
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    points_reward: Number(row.points_reward ?? 25),
  };
}

function getUtcTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);

    const { data: videos, error: videosError } = await supabaseAdmin
      .from('learning_videos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (videosError) throw videosError;

    let completedTodayVideoIds: string[] = [];
    if (user?.id) {
      const { data: logs, error: logsError } = await supabaseAdmin
        .from('video_watch_logs')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('watch_date', getUtcTodayDateString());
      if (!logsError) {
        completedTodayVideoIds = (logs || []).map((row) => String((row as { video_id: string }).video_id));
      }
    }

    return NextResponse.json({
      videos: (videos || []).map((row) => toSafeVideo(row as Record<string, unknown>)),
      completedTodayVideoIds,
    });
  } catch (error: unknown) {
    const message =
      typeof (error as { message?: unknown })?.message === 'string'
        ? String((error as { message: string }).message)
        : error instanceof Error
          ? error.message
          : 'Unexpected error';
    if (isMissingVideoTablesError(message)) {
      return NextResponse.json(
        {
          error:
            'Missing videos tables. Apply migration supabase/migrations/20260727_learning_videos_and_watch_logs.sql to create learning_videos and video_watch_logs.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
