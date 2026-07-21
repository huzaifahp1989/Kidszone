import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject, getReadableObjectUrl } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from('recordings')
      .select(`
        *,
        story:stories(title, summary),
        profile:users(name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (data.audio_path) {
      try {
        data.audio_url = await getReadableObjectUrl('story-recordings', data.audio_path, 86400);
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Get recording to find audio path
    const { data: recording, error: fetchError } = await supabaseAdmin
      .from('recordings')
      .select('audio_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // 2. Delete file from storage (R2 and/or Supabase)
    if (recording.audio_path) {
      try {
        await deleteObject('story-recordings', recording.audio_path);
      } catch (storageError) {
        console.warn('Failed to delete audio file:', storageError);
        // Also try legacy Supabase remove
        try {
          await supabaseAdmin.storage.from('story-recordings').remove([recording.audio_path]);
        } catch {
          /* ignore */
        }
      }
    }

    // 3. Delete record from DB
    const { error: deleteError } = await supabaseAdmin
      .from('recordings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
