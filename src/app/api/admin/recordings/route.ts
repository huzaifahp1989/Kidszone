import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { resolveRecordingCategory, stripCategoryMarker } from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const storyId = searchParams.get('storyId');

    const runQuery = async (orderColumn: 'submitted_at' | 'created_at') => {
      let query = supabaseAdmin
        .from('recordings')
        .select(
          `
          *,
          story:stories(title, summary),
          profile:users(name, email)
        `
        )
        .order(orderColumn, { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(
          `profile.name.ilike.%${search}%,child_name.ilike.%${search}%,story.title.ilike.%${search}%,title.ilike.%${search}%`
        );
      }

      if (storyId) {
        query = query.eq('story_id', storyId);
      }

      return await query;
    };

    let { data, error } = await runQuery('submitted_at');
    if (error && error.message?.includes('submitted_at')) {
      ({ data, error } = await runQuery('created_at'));
    }

    if (error) {
      console.error('Error fetching recordings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = data || [];
    if (category) {
      rows = rows.filter((rec: any) => {
        const resolved = resolveRecordingCategory(rec);
        if (category === 'story') {
          return resolved === 'story' || Boolean(rec.story_id);
        }
        return resolved === category;
      });
    }

    const recordingsWithUrls = await Promise.all(
      rows.map(async (rec: any) => {
        rec.category = resolveRecordingCategory(rec);
        rec.description = stripCategoryMarker(rec.description);
        if (rec.audio_path && !rec.audio_url) {
          try {
            rec.audio_url = await getReadableObjectUrl('story-recordings', rec.audio_path, 3600);
          } catch {
            /* ignore */
          }
        }
        return rec;
      })
    );

    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('recordings')
      .select('status')
      .then((result) => {
        if (result.error) throw result.error;
        const stats = {
          total: result.data.length,
          pending: result.data.filter((r) => r.status === 'submitted').length,
          approved: result.data.filter((r) => r.status === 'approved').length,
          rejected: result.data.filter((r) => r.status === 'rejected').length,
        };
        return { data: stats, error: null };
      });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    return NextResponse.json({
      recordings: recordingsWithUrls,
      stats: statsData || { total: 0, pending: 0, approved: 0, rejected: 0 },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
