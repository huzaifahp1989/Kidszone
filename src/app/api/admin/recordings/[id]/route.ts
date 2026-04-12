import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    // Generate signed URL for audio
    if (data.audio_path) {
      const { data: signedData, error: signedError } = await supabaseAdmin
        .storage
        .from('story-recordings') // Correct bucket name
        .createSignedUrl(data.audio_path, 3600); // 1 hour expiry

      if (!signedError && signedData) {
        data.audio_url = signedData.signedUrl;
      } else {
        const { data: publicUrlData } = supabaseAdmin
          .storage
          .from('story-recordings')
          .getPublicUrl(data.audio_path);
        if (publicUrlData?.publicUrl) {
          data.audio_url = publicUrlData.publicUrl;
        }
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

    // 2. Delete file from storage
    if (recording.audio_path) {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('story-recordings')
        .remove([recording.audio_path]);

      if (storageError) {
        console.warn('Failed to delete audio file:', storageError);
        // Continue to delete record anyway
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
