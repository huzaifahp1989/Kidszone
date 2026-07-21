import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { emailUserChatReply } from '@/lib/chat-email';
import { getErrorMessage, isMissingChatTable, loadConversation, touchConversation } from '@/lib/chat-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const conversation = await loadConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ conversation, messages: data || [] });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat tables not set up. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to load messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const text = String(body?.body || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    const conversation = await loadConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: id,
        sender_type: 'admin',
        body: text,
      })
      .select()
      .single();

    if (error) throw error;
    await touchConversation(id);

    emailUserChatReply({
      displayName: conversation.display_name,
      email: conversation.email,
      message: text,
    }).catch((err) => console.error('[chat] User reply email failed:', err));

    return NextResponse.json({ message: data });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat tables not set up. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to send reply';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
