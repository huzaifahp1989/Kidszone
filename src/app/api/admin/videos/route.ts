import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type VideoSourceType = 'youtube' | 'upload' | 'external';

function parseYouTubeVideoId(input: string): string | null {
  const value = String(input || '').trim();
  if (!value) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (url.hostname.includes('youtube.com')) {
      const fromQuery = url.searchParams.get('v') || '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery;

      const segments = url.pathname.split('/').filter(Boolean);
      const embedIdx = segments.findIndex((seg) => seg === 'embed' || seg === 'shorts');
      if (embedIdx >= 0) {
        const id = segments[embedIdx + 1] || '';
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function toSafeVideo(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    source_type: String(row.source_type || 'youtube') as VideoSourceType,
    video_url: String(row.video_url || ''),
    youtube_video_id: row.youtube_video_id ? String(row.youtube_video_id) : null,
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
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
  const source_type = String(body.source_type || '').trim() as VideoSourceType;
  const rawUrl = String(body.video_url || '').trim();
  const thumbnail_url = String(body.thumbnail_url || '').trim() || null;
  const duration_seconds = body.duration_seconds == null || body.duration_seconds === ''
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
    video_url = `https://www.youtube.com/watch?v=${youtube_video_id}`;
  }

  return {
    title,
    description,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = buildNormalizedBody(body as Record<string, unknown>);

    const { data, error } = await supabaseAdmin
      .from('learning_videos')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ video: toSafeVideo(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
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

    const { error } = await supabaseAdmin
      .from('learning_videos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
