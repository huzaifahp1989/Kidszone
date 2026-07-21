import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  canAccessConversation,
  getErrorMessage,
  getUserDisplayInfo,
  isMissingChatTable,
  type ChatConversation,
} from '@/lib/chat-service';
import { emailAdminChatStarted } from '@/lib/chat-email';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const visitorToken = searchParams.get('visitorToken')?.trim() || null;
    const authUser = await getAuthenticatedRequestUser(request);

    if (conversationId) {
      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      if (!canAccessConversation(data as ChatConversation, authUser?.id, visitorToken)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ conversation: data });
    }

    if (authUser?.id) {
      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'open')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ conversation: data || null });
    }

    if (visitorToken) {
      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .eq('visitor_token', visitorToken)
        .eq('status', 'open')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ conversation: data || null });
    }

    return NextResponse.json({ conversation: null });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat is not set up yet. Run the migration.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to load conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const visitorToken = String(body?.visitorToken || '').trim() || null;
    const guestName = String(body?.name || '').trim();
    const guestEmail = String(body?.email || '').trim().toLowerCase();
    const authUser = await getAuthenticatedRequestUser(request);

    if (authUser?.id) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'open')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return NextResponse.json({ conversation: existing });
      }

      const { displayName, email } = await getUserDisplayInfo(authUser.id, authUser.email);

      const { data, error } = await supabaseAdmin
        .from('chat_conversations')
        .insert({
          user_id: authUser.id,
          visitor_token: visitorToken,
          display_name: displayName,
          email,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      emailAdminChatStarted({
        displayName,
        email,
        conversationId: data.id,
        isLoggedIn: true,
      }).catch((err) => console.error('[chat] Start email failed:', err));

      return NextResponse.json({ conversation: data });
    }

    if (!visitorToken) {
      return NextResponse.json({ error: 'visitorToken is required for guest chat' }, { status: 400 });
    }
    if (!guestName || !guestEmail || !guestEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid name and email are required' }, { status: 400 });
    }

    const { data: existingGuest, error: guestLookupError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('visitor_token', visitorToken)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (guestLookupError) throw guestLookupError;

    if (existingGuest) {
      return NextResponse.json({ conversation: existingGuest });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .insert({
        visitor_token: visitorToken,
        display_name: guestName.slice(0, 120),
        email: guestEmail.slice(0, 200),
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    emailAdminChatStarted({
      displayName: guestName.slice(0, 120),
      email: guestEmail.slice(0, 200),
      conversationId: data.id,
      isLoggedIn: false,
    }).catch((err) => console.error('[chat] Start email failed:', err));

    return NextResponse.json({ conversation: data });
  } catch (error: unknown) {
    if (isMissingChatTable(error)) {
      return NextResponse.json({ error: 'Chat is not set up yet. Ask admin to run chat setup.', setupRequired: true }, { status: 503 });
    }
    const message = getErrorMessage(error) || 'Failed to start conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
