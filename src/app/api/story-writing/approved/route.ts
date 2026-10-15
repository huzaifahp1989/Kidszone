import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadChildInfo } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Public, admin-approved stories only. Private account and review data are never exposed. */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('story_submissions')
    .select('id, user_id, title, content, islamic_lesson, category, illustration_url, age_group, reviewed_at')
    .eq('status', 'APPROVED')
    .eq('is_flagged', false)
    .order('reviewed_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const info = await loadChildInfo((data || []).map((row) => String(row.user_id)));
  return NextResponse.json({
    stories: (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      islamicLesson: row.islamic_lesson,
      category: row.category,
      illustrationUrl: row.illustration_url,
      ageGroup: row.age_group,
      author: info.get(String(row.user_id))?.displayName ?? 'Young Writer',
      approvedAt: row.reviewed_at,
    })),
  }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}
