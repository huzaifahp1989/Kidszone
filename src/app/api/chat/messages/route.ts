import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  canAccessConversation,
  getErrorMessage,
  isMissingChatTable,
  loadConversation,
  touchConversation,
} from '@/lib/chat-service';
import { emailAdminNewChatMessage } from '@/lib/chat-email';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const visitorToken = searchParams.get('visitorToken')?.trim() || null;
    const authUser = await getAuthenticatedRequestUser(request);

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const conversation = await loadConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (!canAccessConversation(conversation, authUser?.id, visitorToken)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ messages: data || [] });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat is not set up yet. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to load messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversationId = String(body?.conversationId || '').trim();
    const text = String(body?.body || '').trim();
    const visitorToken = String(body?.visitorToken || '').trim() || null;
    const authUser = await getAuthenticatedRequestUser(request);

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'conversationId and body are required' }, { status: 400 });
    }
    if (text.length > 4000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    const conversation = await loadConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (!canAccessConversation(conversation, authUser?.id, visitorToken)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
        body: text,
      })
      .select()
      .single();

    if (error) throw error;
    await touchConversation(conversationId);

    emailAdminNewChatMessage({
      displayName: conversation.display_name,
      email: conversation.email,
      message: text,
      conversationId,
    }).catch((err) => console.error('[chat] Admin email failed:', err));

    return NextResponse.json({ message: data });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat is not set up yet. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
