import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function incrementViewCount(id: string) {
  try {
    const { error: rpcErr } = await (supabaseAdmin as any).rpc(
      'global_notices_increment_view_count',
      { notice_id_param: id }
    );
    if (!rpcErr) return;
  } catch { /* RPC not installed; fall through to read+write */ }

  try {
    const { data: cur, error: e1 } = await supabaseAdmin
      .from('global_notices')
      .select('id, view_count')
      .eq('id', id)
      .maybeSingle();
    if (e1) throw e1;
    const next = Number((cur as any)?.view_count ?? 0) + 1;
    const { error: e2 } = await supabaseAdmin
      .from('global_notices')
      .update({ view_count: next } as any)
      .eq('id', id);
    if (e2) throw e2;
  } catch { /* best effort; not fatal */ }
}

async function syncViewerCount(id: string) {
  try {
    const { error: rpcErr } = await (supabaseAdmin as any).rpc(
      'global_notices_increment_viewer_count',
      { notice_id_param: id }
    );
    if (!rpcErr) return;
  } catch { /* RPC not installed; fall through */ }
  try {
    const { data, error } = await supabaseAdmin
      .from('global_notice_views')
      .select('user_id', { head: false })
      .eq('notice_id', id)
      .not('seen_at', 'is', null);
    if (error) throw error;
    const distinct = new Set((data || []).map((r: any) => r.user_id).filter(Boolean));
    await supabaseAdmin
      .from('global_notices')
      .update({ viewer_count: Number(distinct.size) || 0 })
      .eq('id', id);
  } catch { /* best effort */ }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const user = await getAuthenticatedRequestUser(request);
  const { noticeId } = await params;
  if (!noticeId) return NextResponse.json({ error: 'noticeId is required' }, { status: 400 });

  await incrementViewCount(noticeId);
  void syncViewerCount(noticeId);

  if (!user) {
    return NextResponse.json({ ok: true, noticeId, guest: true });
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('global_notice_views')
      .upsert(
        { notice_id: noticeId, user_id: user.id, seen_at: now },
        { onConflict: 'notice_id,user_id', ignoreDuplicates: false }
      );
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Notices table is not configured yet. Apply migration 20260829_create_global_notices.sql.',
            setupRequired: true,
          },
          { status: 500 }
        );
      }
      throw error;
    }
    void syncViewerCount(noticeId);
    return NextResponse.json({ ok: true, noticeId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notice seen';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
