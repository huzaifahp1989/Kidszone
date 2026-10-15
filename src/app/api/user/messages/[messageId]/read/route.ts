import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return NextResponse.json({
          error: 'Message table is not configured yet. Run CREATE_USER_MESSAGES_TABLE.sql in Supabase.',
          setupRequired: true,
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
