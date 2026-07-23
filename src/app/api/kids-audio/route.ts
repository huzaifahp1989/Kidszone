import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import {
  isKidsAudioCategory,
  isMissingTableError,
  KIDS_AUDIO_BUCKET,
  KIDS_AUDIO_LIBRARY_TABLE,
  resolveRecordingCategory,
  stripCategoryMarker,
  type KidsAudioTrack,
} from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const source = searchParams.get('source'); // library | kids | all

    const tracks: KidsAudioTrack[] = [];

    if (!source || source === 'all' || source === 'library') {
      let libraryQuery = supabaseAdmin
        .from(KIDS_AUDIO_LIBRARY_TABLE)
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (category && isKidsAudioCategory(category)) {
        libraryQuery = libraryQuery.eq('category', category);
      }

      const { data: libraryRows, error: libraryError } = await libraryQuery;
      if (libraryError) {
        if (!isMissingTableError(libraryError)) {
          console.error('kids-audio library fetch error:', libraryError);
          return NextResponse.json({ error: libraryError.message }, { status: 500 });
        }
      } else {
        for (const row of libraryRows || []) {
          let audioUrl = row.audio_url || null;
          if (!audioUrl && row.audio_path) {
            try {
              audioUrl = await getReadableObjectUrl(KIDS_AUDIO_BUCKET, row.audio_path, 86400);
            } catch {
              /* ignore */
            }
          }
          tracks.push({
            id: `library-${row.id}`,
            title: row.title,
            description: row.description,
            category: row.category,
            audioUrl,
            durationSeconds: Number(row.duration_seconds || 0),
            coverEmoji: row.cover_emoji || '🎧',
            source: 'library',
            createdAt: row.created_at,
          });
        }
      }
    }

    if (!source || source === 'all' || source === 'kids') {
      // Avoid selecting category until migration is applied — derive it instead.
      const { data: kidsRows, error: kidsError } = await supabaseAdmin
        .from('recordings')
        .select(
          'id, title, description, child_name, audio_path, duration, is_published, submitted_at, created_at, status, story_id'
        )
        .eq('is_published', true)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });

      if (kidsError) {
        console.error('kids recordings fetch error:', kidsError);
      } else {
        for (const row of kidsRows || []) {
          const resolved = resolveRecordingCategory(row);
          if (category && isKidsAudioCategory(category) && resolved !== category) {
            continue;
          }

          let audioUrl: string | null = null;
          if (row.audio_path) {
            try {
              audioUrl = await getReadableObjectUrl(KIDS_AUDIO_BUCKET, row.audio_path, 86400);
            } catch {
              /* ignore */
            }
          }
          tracks.push({
            id: `kids-${row.id}`,
            title: row.title || 'Kids recording',
            description: stripCategoryMarker(row.description),
            category: resolved,
            audioUrl,
            durationSeconds: Number(row.duration || 0),
            coverEmoji: '🌟',
            source: 'kids',
            childName: row.child_name,
            createdAt: row.submitted_at || row.created_at,
          });
        }
      }
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('kids-audio GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
