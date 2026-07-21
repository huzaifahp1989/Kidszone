'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getChatVisitorToken } from '@/lib/chat-visitor';
import { Button } from '@/components';

export type ChatConversation = {
  id: string;
  display_name: string;
  email: string;
  status: string;
};

export type ChatMessage = {
  id: string;
  sender_type: 'user' | 'admin';
  body: string;
  created_at: string;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ChatWidgetProps = {
  /** Compact panel for popup; full layout for /chat page */
  variant?: 'page' | 'popup';
  /** Start loading conversation when mounted (popup can wait until opened) */
  active?: boolean;
  className?: string;
  /** Called when user interacts (resets idle auto-close timer) */
  onActivity?: () => void;
};

export function ChatWidget({ variant = 'page', active = true, className = '', onActivity }: ChatWidgetProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const [visitorToken, setVisitorToken] = useState('');
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isPopup = variant === 'popup';

  useEffect(() => {
    setVisitorToken(getChatVisitorToken());
  }, []);

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const token = visitorToken || getChatVisitorToken();
      const params = new URLSearchParams({ conversationId });
      if (token) params.set('visitorToken', token);
      const res = await fetch(`/api/chat/messages?${params}`, {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.setupRequired) setSetupRequired(true);
      if (!res.ok) throw new Error(json.error || 'Failed to load messages');
      setMessages(json.messages || []);
    },
    [authHeaders, visitorToken]
  );

  const resumeOrStart = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = visitorToken || getChatVisitorToken();
      const headers = await authHeaders();

      const getRes = await fetch(
        `/api/chat/conversations?${new URLSearchParams(token ? { visitorToken: token } : {})}`,
        { headers }
      );
      const getJson = await getRes.json();
      if (getJson.setupRequired) {
        setSetupRequired(true);
        return;
      }

      let conv = getJson.conversation as ChatConversation | null;

      if (!conv && user) {
        const startRes = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers,
          body: JSON.stringify({ visitorToken: token }),
        });
        const startJson = await startRes.json();
        if (startJson.setupRequired) {
          setSetupRequired(true);
          return;
        }
        if (!startRes.ok) throw new Error(startJson.error || 'Could not start chat');
        conv = startJson.conversation;
      }

      if (conv) {
        setConversation(conv);
        await loadMessages(conv.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, loadMessages, user, visitorToken]);

  useEffect(() => {
    if (!active || authLoading || !visitorToken) return;
    resumeOrStart();
  }, [active, authLoading, resumeOrStart, visitorToken]);

  useEffect(() => {
    if (!active || !conversation?.id) return;
    const interval = setInterval(() => {
      loadMessages(conversation.id).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [active, conversation?.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startGuestChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const token = visitorToken || getChatVisitorToken();
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorToken: token,
          name: guestName.trim(),
          email: guestEmail.trim(),
        }),
      });
      const json = await res.json();
      if (json.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Could not start chat');
      setConversation(json.conversation);
      setMessages([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start chat');
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation?.id || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const token = visitorToken || getChatVisitorToken();
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          conversationId: conversation.id,
          body: draft.trim(),
          visitorToken: token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      setMessages((prev) => [...prev, json.message]);
      setDraft('');
      onActivity?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const displayName = user ? profile?.name || user.email?.split('@')[0] : conversation?.display_name;
  const displayEmail = user ? user.email : conversation?.email;

  const guestForm = (
    <form onSubmit={startGuestChat} className={isPopup ? 'p-4' : 'rounded-3xl border border-violet-200/60 bg-white p-6 shadow-[var(--card-shadow)] sm:p-8'}>
      <h2 className="mb-1 text-lg font-bold text-sand-900">Start a conversation</h2>
      <p className="mb-4 text-sm text-sand-600">
        Enter your name and email so we can reply in chat and by email.{' '}
        <Link href="/signin" className="font-semibold text-violet-700 hover:underline">
          Sign in
        </Link>{' '}
        to auto-fill your details.
      </p>
      <div className="space-y-3">
        <input
          type="text"
          required
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full rounded-xl border border-sand-200 px-3 py-2.5 text-sm text-sand-900 outline-none ring-violet-200 focus:ring-2"
          placeholder="Your name"
        />
        <input
          type="email"
          required
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="w-full rounded-xl border border-sand-200 px-3 py-2.5 text-sm text-sand-900 outline-none ring-violet-200 focus:ring-2"
          placeholder="you@example.com"
        />
        <Button type="submit" disabled={starting} size="sm" className="w-full">
          {starting ? 'Starting…' : 'Start chat'}
        </Button>
      </div>
    </form>
  );

  const chatThread = conversation ? (
    <div className={`flex flex-col overflow-hidden bg-white ${isPopup ? 'h-full' : 'rounded-3xl border border-violet-200/60 shadow-[var(--card-shadow)]'}`}>
      {!isPopup && (
        <div className="border-b border-sand-100 bg-gradient-to-r from-violet-50 to-white px-5 py-4">
          <p className="font-bold text-sand-900">{displayName}</p>
          <p className="text-sm text-sand-600">{displayEmail}</p>
          {user && (
            <p className="mt-1 text-xs text-violet-700">Signed in — your profile name and email are shown to admin.</p>
          )}
        </div>
      )}

      <div
        className={`flex flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-4 ${
          isPopup ? 'min-h-[220px] max-h-[280px] flex-1' : 'min-h-[320px] max-h-[min(55vh,520px)] px-4 py-5 sm:px-5'
        }`}
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-sand-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender_type === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isUser
                      ? 'rounded-br-md bg-violet-600 text-white'
                      : 'rounded-bl-md border border-sand-200 bg-sand-50 text-sand-900'
                  }`}
                >
                  {!isUser && (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">Kids Zone Team</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`mt-1 text-[10px] ${isUser ? 'text-violet-200' : 'text-sand-500'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-sand-100 p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onActivity?.();
          }}
          placeholder="Type your message…"
          className="min-w-0 flex-1 rounded-xl border border-sand-200 px-3 py-2.5 text-sm text-sand-900 outline-none ring-violet-200 focus:ring-2"
          maxLength={4000}
        />
        <Button type="submit" disabled={sending || !draft.trim()} size="sm" className="shrink-0 px-3">
          {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </Button>
      </form>
    </div>
  ) : null;

  const body = loading ? (
    <div className={`flex items-center justify-center gap-2 text-sand-600 ${isPopup ? 'py-16' : 'py-20'}`}>
      <Loader2 className="animate-spin" size={20} />
      Loading chat…
    </div>
  ) : !conversation && !user ? (
    guestForm
  ) : !conversation && user ? (
    <div className={`text-center ${isPopup ? 'p-6' : 'py-12'}`}>
      <p className="mb-3 text-sm text-sand-600">Ready to ask a question?</p>
      <Button size="sm" onClick={() => resumeOrStart()}>
        Start chat
      </Button>
    </div>
  ) : (
    chatThread
  );

  if (isPopup) {
    return (
      <div className={`flex h-full flex-col ${className}`}>
        {setupRequired && (
          <div className="border-b border-amber-100 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            <p className="font-bold">Chat is not set up yet</p>
            <p className="mt-1">Ask an admin to open Admin → Live Chat and run setup.</p>
          </div>
        )}
        {error && (
          <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
        )}
        {body}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md">
          <MessageCircle size={24} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-sand-900 sm:text-3xl">Chat with Kids Zone</h1>
          <p className="text-sm text-sand-600">Ask a question — we reply in chat and by email.</p>
        </div>
      </div>

      {setupRequired && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Chat is not set up in the database yet. Run the migration{' '}
          <code className="rounded bg-amber-100 px-1">20260612_create_chat.sql</code> in Supabase.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {body}
    </div>
  );
}
