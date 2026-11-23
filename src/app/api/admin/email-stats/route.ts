import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isAdminSessionRequest } from '@/lib/admin-session';

// GET /api/admin/email-stats -> recent admin broadcasts with open counts.
//
// `opens` is the number of distinct recipients that loaded the tracking pixel
// for that send. `trackingReady` is false when the email tracking tables have
// not been created yet (migration not applied), so the UI can explain why no
// open data is shown.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(isAdminRequest(request) || isAdminSessionRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: sends, error } = await supabaseAdmin
    .from('email_sends')
    .select(
      'id, subject, from_name, audience, transport, recipient_count, sent_count, failed_count, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    // Most likely the tracking tables do not exist yet.
    return NextResponse.json({ trackingReady: false, sends: [], error: error.message });
  }

  const ids = (sends || []).map((row: any) => row.id);
  const opensBySend = new Map<string, number>();

  if (ids.length > 0) {
    const { data: opens } = await supabaseAdmin
      .from('email_opens')
      .select('send_id')
      .in('send_id', ids);

    for (const row of opens || []) {
      const id = String((row as any).send_id);
      opensBySend.set(id, (opensBySend.get(id) || 0) + 1);
    }
  }

  return NextResponse.json({
    trackingReady: true,
    sends: (sends || []).map((row: any) => ({
      id: row.id,
      subject: row.subject,
      fromName: row.from_name,
      audience: row.audience,
      transport: row.transport,
      recipientCount: row.recipient_count,
      sentCount: row.sent_count,
      failedCount: row.failed_count,
      createdAt: row.created_at,
      opens: opensBySend.get(String(row.id)) || 0,
    })),
  });
}
