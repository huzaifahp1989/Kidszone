import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { KIDS_CHANNEL_SEED } from '@/data/kids-channel-seed';
import { fetchYouTubeOEmbed, youtubeWatchUrl } from '@/lib/youtube';
import { youtubeThumbnailUrl } from '@/lib/video-categories';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ids = KIDS_CHANNEL_SEED.map((v) => v.youtubeId);
    const { data: existing } = await supabaseAdmin
      .from('learning_videos')
      .select('youtube_video_id')
      .in('youtube_video_id', ids);

    const existingIds = new Set(
      (existing || []).map((r) => String((r as { youtube_video_id: string }).youtube_video_id))
    );

    const payloads = [];
    for (const seed of KIDS_CHANNEL_SEED) {
      if (existingIds.has(seed.youtubeId)) continue;
      const meta = await fetchYouTubeOEmbed(seed.youtubeId);
      payloads.push({
        title: meta?.title || seed.fallbackTitle,
        description: seed.description,
        category: seed.category,
        source_type: 'youtube',
        video_url: youtubeWatchUrl(seed.youtubeId),
        youtube_video_id: seed.youtubeId,
        thumbnail_url: youtubeThumbnailUrl(seed.youtubeId),
        duration_seconds: null,
        points_reward: seed.points_reward,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    if (!payloads.length) {
      return NextResponse.json({
        ok: true,
        added: 0,
        message: 'Starter videos are already on the channel.',
      });
    }

    const { data, error } = await supabaseAdmin.from('learning_videos').insert(payloads).select('id');
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('category')) {
        return NextResponse.json(
          {
            error:
              'Missing category column. Run SETUP_KIDS_CHANNEL_VIDEOS.sql in Supabase first, then seed again.',
          },
          { status: 400 }
        );
      }
      if (msg.toLowerCase().includes('learning_videos') || msg.toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'Missing learning_videos table. Run supabase/migrations/20260727_learning_videos_and_watch_logs.sql first.',
          },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      ok: true,
      added: data?.length || payloads.length,
      message: `Added ${data?.length || payloads.length} starter videos to Kids Channel.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
