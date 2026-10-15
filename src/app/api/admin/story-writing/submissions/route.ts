import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadChildInfo, isMissingTableError, mapStory } from '@/lib/story-writing-server';
import { STORY_STATUSES } from '@/lib/story-writing';

export const dynamic = 'force-dynamic';

/** Admin list of submissions with status, search and flagged filters. */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const status = (params.get('status') || '').toUpperCase();
  const search = (params.get('q') || '').trim().toLowerCase();
  const flaggedOnly = params.get('flagged') === '1';

  let query = supabaseAdmin
    .from('story_submissions')
    .select('*')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(500);
  if ((STORY_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);
  else if (status === 'NOT_DRAFT') query = query.neq('status', 'DRAFT');
  if (flaggedOnly) query = query.eq('is_flagged', true);

  const { data, error } = await query;
  if (error) {
    const missing = isMissingTableError(error);
    return NextResponse.json({ error: error.message, setupRequired: missing }, { status: missing ? 503 : 500 });
  }

  const info = await loadChildInfo((data || []).map((row) => String(row.user_id)));
  let stories = (data || []).map((row) => mapStory(row, info.get(String(row.user_id))));
  if (search) {
    stories = stories.filter((story) =>
      [story.id, story.userId, story.displayName, story.title, story.content, story.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }
  return NextResponse.json({ stories });
}
