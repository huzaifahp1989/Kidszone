import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> }
) {
  const user = await getAuthenticatedRequestUser(request);
  const { noticeId } = await params;
  if (!noticeId) return NextResponse.json({ error: 'noticeId is required' }, { status: 400 });
  if (!user) {
    return NextResponse.json({ ok: true, noticeId, guest: true });
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('global_notice_views')
      .upsert(
        { notice_id: noticeId, user_id: user.id, read_at: now, seen_at: now },
        { onConflict: 'notice_id,user_id' }
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
    return NextResponse.json({ ok: true, noticeId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notice read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
