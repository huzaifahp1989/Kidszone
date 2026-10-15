import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapStory } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;

  const { data } = await supabaseAdmin
    .from('story_submissions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  return NextResponse.json({ story: mapStory(data) });
}

/** Children can delete their own drafts only. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from('story_submissions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'DRAFT')
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Only drafts can be deleted.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
