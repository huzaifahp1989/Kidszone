import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function fetchLiveNotices(limit: number) {
  const now = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from('global_notices')
    .select('*, global_notice_views(user_id,seen_at,read_at,dismissed_at)')
    .eq('active', true)
    .lte('publish_at', now)
    .or('expire_at.is.null,expire_at.gt.' + now)
    .order('publish_at', { ascending: false })
    .limit(limit);

  return { rows, error };
}

function mapRowsToNotices(rows: any[] | null, user_id: string | null) {
  return (rows || []).map((r: any) => {
    const views: Array<any> = Array.isArray(r.global_notice_views) ? r.global_notice_views : [];
    const mine = user_id ? views.find((v) => v.user_id === user_id) : undefined;
    const isDismissed = Boolean(mine?.dismissed_at);
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url || null,
      icon: r.icon || '🔔',
      priority: (r.priority as any) || 'normal',
      publishAt: r.publish_at,
      expireAt: r.expire_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      viewCount: Number(r.view_count ?? 0),
      viewerCount: Number(r.viewer_count ?? 0),
      seenAt: mine?.seen_at || null,
      readAt: mine?.read_at || null,
      dismissedAt: mine?.dismissed_at || null,
      isSeen: Boolean(mine?.seen_at),
      isRead: Boolean(mine?.read_at),
      isDismissed,
    };
  });
}

function summarize(notices: any[]) {
  const visible = notices.filter((n) => !n.isDismissed);
  const total = visible.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of visible) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { total, unread_count, unseen_count, urgent_unread_count, notices: visible };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  const limit = Number.isFinite(Number(limitRaw))
    ? Math.max(1, Math.min(100, Math.floor(Number(limitRaw))))
    : 25;

  const user_id: string | null = user?.id ?? null;

  try {
    const { rows, error } = await fetchLiveNotices(limit);
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

    const notices = mapRowsToNotices(rows, user_id);
    return NextResponse.json(summarize(notices));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
