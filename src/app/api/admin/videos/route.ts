import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { normalizeVideoCategory, youtubeThumbnailUrl } from '@/lib/video-categories';
import {
  fetchYouTubeOEmbed,
  parseYouTubeVideoId,
  splitYouTubeUrlLines,
  youtubeWatchUrl,
} from '@/lib/youtube';

export const dynamic = 'force-dynamic';

type VideoSourceType = 'youtube' | 'upload' | 'external';

function toSafeVideo(row: Record<string, unknown>) {
  const youtube_video_id = row.youtube_video_id ? String(row.youtube_video_id) : null;
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    category: normalizeVideoCategory(row.category),
    source_type: String(row.source_type || 'youtube') as VideoSourceType,
    video_url: String(row.video_url || ''),
    youtube_video_id,
    thumbnail_url: row.thumbnail_url
      ? String(row.thumbnail_url)
      : youtubeThumbnailUrl(youtube_video_id),
    duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    points_reward: Number(row.points_reward ?? 25),
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function buildNormalizedBody(body: Record<string, unknown>) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = normalizeVideoCategory(body.category);
  const source_type = String(body.source_type || '').trim() as VideoSourceType;
  const rawUrl = String(body.video_url || '').trim();
  let thumbnail_url = String(body.thumbnail_url || '').trim() || null;
  const duration_seconds =
    body.duration_seconds == null || body.duration_seconds === ''
      ? null
      : Math.max(0, Math.floor(Number(body.duration_seconds)));
  const points_reward = Math.max(0, Math.min(200, Math.floor(Number(body.points_reward ?? 25))));
  const is_active = body.is_active !== false;

  if (!title) throw new Error('Title is required.');
  if (!['youtube', 'upload', 'external'].includes(source_type)) {
    throw new Error('source_type must be youtube, upload, or external.');
  }
  if (!rawUrl) throw new Error('video_url is required.');

  let video_url = rawUrl;
  let youtube_video_id: string | null = null;

  if (source_type === 'youtube') {
    youtube_video_id = parseYouTubeVideoId(rawUrl);
    if (!youtube_video_id) {
      throw new Error('Invalid YouTube URL or video id.');
    }
    video_url = youtubeWatchUrl(youtube_video_id);
    if (!thumbnail_url) thumbnail_url = youtubeThumbnailUrl(youtube_video_id);
  }

  return {
    title,
    description,
    category,
    source_type,
    video_url,
    youtube_video_id,
    thumbnail_url,
    duration_seconds,
    points_reward,
    is_active,
    updated_at: new Date().toISOString(),
  };
}

function missingCategoryMessage(message: string) {
  const m = message.toLowerCase();
  return m.includes('category') && (m.includes('column') || m.includes('schema cache'));
}

async function bulkInsertYouTube(body: Record<string, unknown>) {
  const category = normalizeVideoCategory(body.category);
  const points_reward = Math.max(0, Math.min(200, Math.floor(Number(body.points_reward ?? 25))));
  const is_active = body.is_active !== false;
  const description = String(body.description || '').trim();

  const fromArray = Array.isArray(body.urls)
    ? body.urls.map((u) => String(u || '').trim()).filter(Boolean)
    : [];
  const fromText = splitYouTubeUrlLines(String(body.urls_text || body.video_urls || ''));
  const lines = [...fromArray, ...fromText];

  if (!lines.length) {
    throw new Error('Paste at least one YouTube URL (one per line).');
  }

  const seen = new Set<string>();
  const payloads: Array<Record<string, unknown>> = [];
  const failed: Array<{ url: string; error: string }> = [];

  for (const line of lines) {
    const youtube_video_id = parseYouTubeVideoId(line);
    if (!youtube_video_id) {
      failed.push({ url: line, error: 'Invalid YouTube URL or id' });
      continue;
    }
    if (seen.has(youtube_video_id)) continue;
    seen.add(youtube_video_id);

    const meta = await fetchYouTubeOEmbed(youtube_video_id);
    payloads.push({
      title: meta?.title || `YouTube video ${youtube_video_id}`,
      description: description || (meta?.author_name ? `By ${meta.author_name}` : ''),
      category,
      source_type: 'youtube',
      video_url: youtubeWatchUrl(youtube_video_id),
      youtube_video_id,
      thumbnail_url: youtubeThumbnailUrl(youtube_video_id),
      duration_seconds: null,
      points_reward,
      is_active,
      updated_at: new Date().toISOString(),
    });
  }

  if (!payloads.length) {
    return { added: [], failed, skippedDuplicates: 0 };
  }

  // Skip ones already in DB
  const ids = payloads.map((p) => String(p.youtube_video_id));
  const { data: existing } = await supabaseAdmin
    .from('learning_videos')
    .select('youtube_video_id')
    .in('youtube_video_id', ids);

  const existingIds = new Set((existing || []).map((r) => String((r as { youtube_video_id: string }).youtube_video_id)));
  const toInsert = payloads.filter((p) => !existingIds.has(String(p.youtube_video_id)));
  const skippedDuplicates = payloads.length - toInsert.length;

  if (!toInsert.length) {
    return { added: [], failed, skippedDuplicates };
  }

  const { data, error } = await supabaseAdmin.from('learning_videos').insert(toInsert).select('*');
  if (error) throw error;

  return {
    added: (data || []).map((row) => toSafeVideo(row as Record<string, unknown>)),
    failed,
    skippedDuplicates,
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('learning_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ videos: (data || []).map((row) => toSafeVideo(row as Record<string, unknown>)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (missingCategoryMessage(message)) {
      return NextResponse.json(
        {
          error:
            'Missing category column. Run SETUP_KIDS_CHANNEL_VIDEOS.sql in Supabase, then try again.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.bulk === true || Array.isArray(body.urls) || body.urls_text || body.video_urls) {
      const result = await bulkInsertYouTube(body);
      return NextResponse.json({
        ok: true,
        ...result,
        message: `Added ${result.added.length} video(s)${
          result.skippedDuplicates ? `, skipped ${result.skippedDuplicates} already saved` : ''
        }${result.failed.length ? `, ${result.failed.length} failed` : ''}.`,
      });
    }

    const payload = buildNormalizedBody(body);

    const { data, error } = await supabaseAdmin
      .from('learning_videos')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ video: toSafeVideo(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (missingCategoryMessage(message)) {
      return NextResponse.json(
        {
          error:
            'Missing category column. Run SETUP_KIDS_CHANNEL_VIDEOS.sql in Supabase, then try again.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String((body as Record<string, unknown>).id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const payload = buildNormalizedBody(body as Record<string, unknown>);

    const { data, error } = await supabaseAdmin
      .from('learning_videos')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ video: toSafeVideo(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (missingCategoryMessage(message)) {
      return NextResponse.json(
        {
          error:
            'Missing category column. Run SETUP_KIDS_CHANNEL_VIDEOS.sql in Supabase, then try again.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('learning_videos').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
