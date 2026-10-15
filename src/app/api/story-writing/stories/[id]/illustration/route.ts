import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject, newAssetPath, uploadObject } from '@/lib/object-storage';
import { ILLUSTRATION_TYPES, STORY_LIMITS } from '@/lib/story-writing';

export const dynamic = 'force-dynamic';

const BUCKET = 'voucher-assets';
const EDITABLE = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'];

async function loadOwnEditableStory(request: Request, id: string) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data } = await supabaseAdmin
    .from('story_submissions')
    .select('id, user_id, status, illustration_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: 'Story not found.' }, { status: 404 }) };
  if (!EDITABLE.includes(String(data.status))) {
    return { error: NextResponse.json({ error: 'This story can no longer be edited.' }, { status: 409 }) };
  }
  return { user, story: data };
}

async function removeOld(path: unknown) {
  if (typeof path !== 'string' || !path) return;
  try {
    await deleteObject(BUCKET, path);
  } catch {
    /* orphaned file is harmless */
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const loaded = await loadOwnEditableStory(request, id);
  if ('error' in loaded) return loaded.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Please choose a picture.' }, { status: 400 });

  const ext = ILLUSTRATION_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Pictures must be JPG, PNG or WebP.' }, { status: 400 });
  if (file.size > STORY_LIMITS.illustrationMaxBytes) {
    return NextResponse.json({ error: 'Picture is too big. Please use one under 4 MB.' }, { status: 400 });
  }

  try {
    const uploaded = await uploadObject({
      bucket: BUCKET,
      path: newAssetPath(`story-illustrations/${loaded.user.id}`, ext),
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    const { error } = await supabaseAdmin
      .from('story_submissions')
      .update({ illustration_url: uploaded.url, illustration_path: uploaded.path, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', loaded.user.id);
    if (error) throw error;

    await removeOld(loaded.story.illustration_path);
    return NextResponse.json({ illustrationUrl: uploaded.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const loaded = await loadOwnEditableStory(request, id);
  if ('error' in loaded) return loaded.error;

  await supabaseAdmin
    .from('story_submissions')
    .update({ illustration_url: null, illustration_path: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', loaded.user.id);
  await removeOld(loaded.story.illustration_path);
  return NextResponse.json({ ok: true });
}
