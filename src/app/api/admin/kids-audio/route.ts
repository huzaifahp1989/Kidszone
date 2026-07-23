import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import {
  isKidsAudioCategory,
  isMissingTableError,
  KIDS_AUDIO_BUCKET,
  KIDS_AUDIO_LIBRARY_TABLE,
  KIDS_AUDIO_SETUP_SQL,
} from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(KIDS_AUDIO_LIBRARY_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          tracks: [],
          tableMissing: true,
          setupSql: KIDS_AUDIO_SETUP_SQL,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tracks = await Promise.all(
      (data || []).map(async (row) => {
        let audioUrl = row.audio_url || null;
        if (!audioUrl && row.audio_path) {
          try {
            audioUrl = await getReadableObjectUrl(KIDS_AUDIO_BUCKET, row.audio_path, 86400);
          } catch {
            /* ignore */
          }
        }
        return { ...row, audio_url: audioUrl };
      })
    );

    return NextResponse.json({ tracks, tableMissing: false });
  } catch (error) {
    console.error('admin kids-audio GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim() || null;
    const category = String(body.category || 'story').trim();
    const audioPath = String(body.audioPath || body.audio_path || '').trim();
    const audioUrl = String(body.audioUrl || body.audio_url || '').trim() || null;
    const durationSeconds = Number(body.durationSeconds || body.duration_seconds || 0);
    const coverEmoji = String(body.coverEmoji || body.cover_emoji || '🎧').trim() || '🎧';
    const sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0);
    const isPublished = body.isPublished ?? body.is_published ?? true;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!isKidsAudioCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!audioPath) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(KIDS_AUDIO_LIBRARY_TABLE)
      .insert({
        title,
        description,
        category,
        audio_path: audioPath,
        audio_url: audioUrl,
        duration_seconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0,
        cover_emoji: coverEmoji,
        sort_order: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 0,
        is_published: Boolean(isPublished),
      })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Kids audio table missing. Run setup SQL first.', setupSql: KIDS_AUDIO_SETUP_SQL, tableMissing: true },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ track: data, success: true });
  } catch (error) {
    console.error('admin kids-audio POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
