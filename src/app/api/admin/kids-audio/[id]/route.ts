import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject } from '@/lib/object-storage';
import {
  isKidsAudioCategory,
  isMissingTableError,
  KIDS_AUDIO_BUCKET,
  KIDS_AUDIO_LIBRARY_TABLE,
  KIDS_AUDIO_SETUP_SQL,
} from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title != null) payload.title = String(body.title).trim();
    if (body.description != null) payload.description = String(body.description).trim() || null;
    if (body.category != null) {
      if (!isKidsAudioCategory(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      payload.category = body.category;
    }
    if (body.coverEmoji != null || body.cover_emoji != null) {
      payload.cover_emoji = String(body.coverEmoji || body.cover_emoji || '🎧');
    }
    if (body.sortOrder != null || body.sort_order != null) {
      payload.sort_order = Math.floor(Number(body.sortOrder ?? body.sort_order) || 0);
    }
    if (body.durationSeconds != null || body.duration_seconds != null) {
      payload.duration_seconds = Math.max(0, Math.floor(Number(body.durationSeconds ?? body.duration_seconds) || 0));
    }
    if (body.isPublished != null || body.is_published != null) {
      payload.is_published = Boolean(body.isPublished ?? body.is_published);
    }
    if (body.audioPath || body.audio_path) {
      payload.audio_path = String(body.audioPath || body.audio_path);
    }
    if (body.audioUrl != null || body.audio_url != null) {
      payload.audio_url = String(body.audioUrl || body.audio_url || '') || null;
    }

    const { data, error } = await supabaseAdmin
      .from(KIDS_AUDIO_LIBRARY_TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: 'Table missing', setupSql: KIDS_AUDIO_SETUP_SQL, tableMissing: true }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ track: data, success: true });
  } catch (error) {
    console.error('admin kids-audio PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(KIDS_AUDIO_LIBRARY_TABLE)
      .select('id, audio_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      if (isMissingTableError(fetchError)) {
        return NextResponse.json({ error: 'Table missing', setupSql: KIDS_AUDIO_SETUP_SQL, tableMissing: true }, { status: 409 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from(KIDS_AUDIO_LIBRARY_TABLE).delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.audio_path) {
      try {
        await deleteObject(KIDS_AUDIO_BUCKET, existing.audio_path);
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin kids-audio DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
