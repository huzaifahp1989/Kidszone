import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return NextResponse.json({
          error: 'Message table is not configured yet. Run CREATE_USER_MESSAGES_TABLE.sql in Supabase.',
          setupRequired: true,
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({
      messages: (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        url: row.url,
        source: row.source,
        sentBy: row.sent_by,
        createdAt: row.created_at,
        readAt: row.read_at,
        isUnread: !row.read_at,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
