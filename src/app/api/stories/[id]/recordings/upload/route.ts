import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject, uploadObject } from '@/lib/object-storage';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Upload a story recording via server (R2 preferred, Supabase fallback).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await context.params;
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('recording') || formData.get('file');
    const durationRaw = formData.get('duration');
    const duration = Number(durationRaw || 0);

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Recording file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) {
      return NextResponse.json({ error: 'Recording is empty' }, { status: 400 });
    }

    const uploadedFile = file as File;
    const mimeType = uploadedFile.type || 'audio/webm';
    const extension = mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('mpeg')
        ? 'mp3'
        : mimeType.includes('ogg')
          ? 'ogg'
          : 'webm';
    const filename = `${authUser.id}/${Date.now()}_${storyId}.${extension}`;

    await uploadObject({
      bucket: 'story-recordings',
      path: filename,
      body: buffer,
      contentType: mimeType,
    });

    const { data: insertedRecord, error: dbError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: authUser.id,
        story_id: storyId,
        audio_path: filename,
        duration: Number.isFinite(duration) ? duration : 0,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      try {
        await deleteObject('story-recordings', filename);
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: dbError.message || 'Failed to save recording' }, { status: 500 });
    }

    return NextResponse.json({ success: true, recording: insertedRecord });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
