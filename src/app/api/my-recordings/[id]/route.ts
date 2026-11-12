import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject } from '@/lib/object-storage';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isEditableStatus, isRecordingCategory, isRecordingStatus } from '@/lib/recording-categories';

type RouteContext = { params: Promise<{ id: string }> };

const EDITABLE_FIELDS = ['title', 'description', 'category', 'status'] as const;

function getMissingColumnFromError(message: string): string | null {
  const match = String(message || '').match(
    /Could not find the '([\w_]+)' column|column\s+"?([\w_]+)"?\s+does not exist/i
  );
  return match?.[1] || match?.[2] || null;
}

/** Update a row, dropping any column the schema cache does not know about yet. */
async function updateRecordingCompat(id: string, userId: string, payload: Record<string, unknown>) {
  let candidate = { ...payload };
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= EDITABLE_FIELDS.length; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from('recordings')
      .update(candidate)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error) return { data, error: null };

    lastError = error;
    const missing = getMissingColumnFromError((error as { message?: string }).message || '');
    if (missing && missing in candidate) {
      delete candidate[missing];
      continue;
    }
    break;
  }

  return { data: null, error: lastError };
}

async function loadOwnedRecording(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('recordings')
    .select('id, user_id, category, title, description, audio_path, status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** PATCH /api/my-recordings/[id] — rename / edit metadata of the user's own recording. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await loadOwnedRecording(id, authUser.id);
    if (!existing) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }
    if (!isEditableStatus(existing.status)) {
      return NextResponse.json(
        { error: 'This recording has been reviewed and can no longer be edited.' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      payload.title = title.slice(0, 120);
    }
    if (typeof body.description === 'string') {
      payload.description = body.description.trim().slice(0, 1000);
    }
    if (typeof body.category === 'string') {
      if (!isRecordingCategory(body.category)) {
        return NextResponse.json({ error: 'Unknown recording category' }, { status: 400 });
      }
      payload.category = body.category;
    }
    if (typeof body.status === 'string') {
      if (!isRecordingStatus(body.status) || !isEditableStatus(body.status)) {
        return NextResponse.json({ error: 'Invalid status change' }, { status: 400 });
      }
      payload.status = body.status;
      if (body.status === 'submitted') {
        payload.submitted_at = new Date().toISOString();
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await updateRecordingCompat(id, authUser.id, payload);
    if (error) {
      console.error('my-recordings PATCH error:', error);
      return NextResponse.json(
        { error: (error as { message?: string }).message || 'Failed to update recording' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, recording: data });
  } catch (error) {
    console.error('Error in my-recordings PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/my-recordings/[id] — delete the user's own recording + its audio file. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await loadOwnedRecording(id, authUser.id);
    if (!existing) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }
    if (existing.status === 'approved') {
      return NextResponse.json(
        { error: 'Approved recordings cannot be deleted. Please contact your teacher.' },
        { status: 403 }
      );
    }

    if (existing.audio_path) {
      try {
        await deleteObject('story-recordings', existing.audio_path);
      } catch (storageError) {
        console.error('Failed to delete recording audio (continuing):', storageError);
      }
    }

    const { error } = await supabaseAdmin
      .from('recordings')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.id);

    if (error) {
      console.error('my-recordings DELETE error:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete recording' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in my-recordings DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
