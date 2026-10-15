import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function incrementViewerCount(noticeId: string) {
  try {
    const { error: rpcError } = await supabaseAdmin.rpc(
      'global_notices_increment_viewer_count',
      { notice_id_param: noticeId } as any
    );
    if (!rpcError) return;

    const { data, error: sumError } = await supabaseAdmin
      .from('global_notice_views')
      .select('user_id', { count: 'exact', head: false })
      .eq('notice_id', noticeId)
      .not('seen_at', 'is', null);
    if (sumError) throw sumError;
    const distinct = new Set((data || []).map((r: any) => r.user_id).filter(Boolean));
    await supabaseAdmin
      .from('global_notices')
      .update({ viewer_count: Number(distinct.size) || 0 })
      .eq('id', noticeId);
  } catch (e) {
    /* best-effort only */
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ noticeId: string }> }) {
  const { noticeId } = await params;
  const user = await getAuthenticatedRequestUser(request);
  const now = new Date().toISOString();

  try {
    if (user?.id) {
      const { error } = await supabaseAdmin.from('global_notice_views').upsert(
        {
          notice_id: noticeId,
          user_id: user.id,
          seen_at: now,
          read_at: now,
          dismissed_at: now,
        },
        {
          onConflict: 'notice_id,user_id',
        }
      );
      if (error) throw error;
    }

    await incrementViewerCount(noticeId);

    return NextResponse.json({
      success: true,
      guest: !user?.id,
      noticeId,
      dismissedAt: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to dismiss notice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
