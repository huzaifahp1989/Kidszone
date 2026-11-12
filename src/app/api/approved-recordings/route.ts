import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { loadChildInfo } from '@/lib/story-writing-server';
import { getRecordingCategoryMeta, isRecordingCategory } from '@/lib/recording-categories';

export const dynamic = 'force-dynamic';

/**
 * Public gallery of recordings a teacher has reviewed AND chosen to publish.
 *
 * Only `status = approved` + `is_published = true` rows are ever returned, and
 * the payload carries child-safe display names only (never emails or surnames).
 * Audio is exposed as a short-lived signed URL, so no storage credentials reach
 * the browser.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get('category');
    const rawSearch = (searchParams.get('search') || '').trim();
    const storyId = searchParams.get('storyId');
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 200) : 200;

    const buildQuery = (orderColumn: 'reviewed_at' | 'created_at') => {
      let query = supabaseAdmin
        .from('recordings')
        .select(
          'id, user_id, story_id, category, title, description, child_name, audio_path, duration, duration_seconds, points_awarded, reviewed_at, submitted_at, created_at, story:stories(title, summary)'
        )
        .eq('status', 'approved')
        .eq('is_published', true)
        .limit(limit);

      if (rawCategory && isRecordingCategory(rawCategory)) {
        query = query.eq('category', rawCategory);
      }
      if (storyId) {
        query = query.eq('story_id', storyId);
      }
      if (rawSearch) {
        const term = rawSearch.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
        if (term) {
          query = query.or(`title.ilike.%${term}%,child_name.ilike.%${term}%,description.ilike.%${term}%`);
        }
      }

      return query.order(orderColumn, { ascending: false });
    };

    let { data, error } = await buildQuery('reviewed_at');
    if (error && error.message?.includes('reviewed_at')) {
      ({ data, error } = await buildQuery('created_at'));
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const childInfo = await loadChildInfo(rows.map((row) => String(row.user_id || '')));

    const recordings = await Promise.all(
      rows.map(async (row) => {
        const story = row.story as { title?: string; summary?: string } | null;
        const seconds = Number(row.duration ?? row.duration_seconds ?? 0) || 0;
        const categoryMeta = getRecordingCategoryMeta(row.category);

        let audioUrl: string | null = null;
        if (row.audio_path) {
          try {
            audioUrl = await getReadableObjectUrl('story-recordings', String(row.audio_path), 3600);
          } catch {
            audioUrl = null;
          }
        }

        return {
          id: String(row.id),
          title: (row.title as string | null) || story?.title || 'Recording',
          description: (row.description as string | null) || null,
          category: (row.category as string | null) ?? null,
          categoryLabel: categoryMeta?.label ?? 'Recording',
          categoryEmoji: categoryMeta?.emoji ?? '🎙️',
          storyId: (row.story_id as string | null) ?? null,
          storyTitle: story?.title ?? null,
          storySummary: story?.summary ?? null,
          author: childInfo.get(String(row.user_id || ''))?.displayName ?? 'Young Reciter',
          durationSeconds: seconds,
          pointsAwarded: Math.max(0, Number(row.points_awarded || 0)),
          approvedAt: (row.reviewed_at as string | null) ?? (row.submitted_at as string | null) ?? (row.created_at as string | null),
          audioUrl,
        };
      })
    );

    return NextResponse.json(
      { recordings },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load approved recordings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
