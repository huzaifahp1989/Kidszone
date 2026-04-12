import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

      if (category) {
        if (category === 'story') {
          query = query.not('story_id', 'is', null);
        } else {
          // For studio recordings, we need to check if there's a category field or if story_id is null
          query = query.or(`category.eq.${category},and(story_id.is.null,category.is.null)`);
        }
      }

      if (search) {
        query = query.or(`profile.name.ilike.%${search}%,child_name.ilike.%${search}%,story.title.ilike.%${search}%,title.ilike.%${search}%`);
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

    // Get stats
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('recordings')
      .select('status')
      .then(result => {
        if (result.error) throw result.error;
        const stats = {
          total: result.data.length,
          pending: result.data.filter(r => r.status === 'submitted').length,
          approved: result.data.filter(r => r.status === 'approved').length,
          rejected: result.data.filter(r => r.status === 'rejected').length,
        };
        return { data: stats, error: null };
      });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    return NextResponse.json({
      recordings: data,
      stats: statsData || { total: 0, pending: 0, approved: 0, rejected: 0 }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
