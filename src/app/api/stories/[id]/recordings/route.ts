import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const baseQuery = () =>
      supabaseAdmin
        .from('recordings')
        .select('id, audio_path, duration, duration_seconds, child_name')
        .eq('story_id', id)
        .eq('status', 'approved')
        .eq('is_published', true);

    let { data, error } = await baseQuery().order('submitted_at', { ascending: false });
    if (error && error.message?.includes('submitted_at')) {
      ({ data, error } = await baseQuery().order('created_at', { ascending: false }));
    }
    if (error && error.message?.includes('created_at')) {
      ({ data, error } = await baseQuery());
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recordingsWithUrls = await Promise.all(
      (data || []).map(async (recording) => {
        let audioUrl: string | undefined;
        if (recording.audio_path) {
          try {
            audioUrl = await getReadableObjectUrl('story-recordings', recording.audio_path, 3600);
          } catch {
            audioUrl = undefined;
          }
        }
        return {
          ...recording,
          audio_url: audioUrl,
        };
      })
    );

    return NextResponse.json({ recordings: recordingsWithUrls });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load recordings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
