import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  try {
    const now = new Date().toISOString();
    const { data: idsData, error: idsError } = await supabaseAdmin
      .from('global_notices')
      .select('id')
      .eq('active', true)
      .lte('publish_at', now)
      .or('expire_at.is.null,expire_at.gt.' + now);
    if (idsError) {
      if (String(idsError.message || '').includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Notices table is not configured yet. Apply migration 20260829_create_global_notices.sql.',
            setupRequired: true,
          },
          { status: 500 }
        );
      }
      throw idsError;
    }
    const ids: Array<string> = (idsData || []).map((r: any) => r.id);
    if (ids.length === 0) return NextResponse.json({ ok: true, marked: 0 });

    if (!user) {
      return NextResponse.json({ ok: true, marked: ids.length, guest: true });
    }

    const rows = ids.map((id) => ({
      notice_id: id,
      user_id: user.id,
      seen_at: now,
      read_at: now,
    }));
    const { error } = await supabaseAdmin
      .from('global_notice_views')
      .upsert(rows, { onConflict: 'notice_id,user_id', ignoreDuplicates: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, marked: ids.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark all notices read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
