'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components';
import { AdminNotificationBadge } from '@/components/AdminNotificationBadge';
import { useAdminNotificationCounts } from '@/lib/use-admin-notification-counts';

type ConversationRow = {
  id: string;
  display_name: string;
  email: string;
  user_id: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  lastMessage: { body: string; sender_type: string; created_at: string } | null;
  needsReply: boolean;
};

type ChatMessage = {
  id: string;
  sender_type: 'user' | 'admin';
  body: string;
  created_at: string;
};

const adminHeaders = { 'x-admin-auth': 'true', 'Content-Type': 'application/json' };

function formatTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<ConversationRow | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupSql, setSetupSql] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { counts: adminNotifyCounts } = useAdminNotificationCounts(15000);

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') router.push('/admin/login');
  }, [router]);

  useEffect(() => {
    fetch('/api/admin/setup-chat', { headers: adminHeaders })
      .then((r) => r.json())
      .then((d) => {
        if (!d.exists) {
          setSetupRequired(true);
          if (d.sql) setSetupSql(d.sql);
        }
      })
      .catch(() => {});
  }, []);

  const runChatSetup = async () => {
    setSetupLoading(true);
    setSetupMessage(null);
    try {
      const res = await fetch('/api/admin/setup-chat', { method: 'POST', headers: adminHeaders });
      const json = await res.json();
      if (json.sql && !json.success) setSetupSql(json.sql);
      setSetupMessage(json.message || (json.success ? 'Chat tables ready.' : 'Setup failed.'));
      if (json.success) {
        setSetupRequired(false);
        setLoadingList(true);
        loadConversations();
      }
    } catch {
      setSetupMessage('Setup request failed.');
    } finally {
      setSetupLoading(false);
    }
  };

  const copySetupSql = () => {
    if (setupSql) navigator.clipboard.writeText(setupSql);
  };

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat/conversations', { headers: adminHeaders });
      const json = await res.json();
      if (json.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Failed to load chats');
      setConversations(json.conversations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chat/conversations/${id}/messages`, { headers: adminHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load messages');
      setMessages(json.messages || []);
      setSelectedMeta(
        conversations.find((c) => c.id === id) || {
          ...(json.conversation as ConversationRow),
          lastMessage: null,
          needsReply: false,
        }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoadingThread(false);
    }
  }, [conversations]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    loadThread(selectedId);
    const interval = setInterval(() => loadThread(selectedId), 4000);
    return () => clearInterval(interval);
  }, [selectedId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (row: ConversationRow) => {
    setSelectedId(row.id);
    setSelectedMeta(row);
    setMessages([]);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chat/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ body: draft.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      setMessages((prev) => [...prev, json.message]);
      setDraft('');
      loadConversations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const needsReplyCount = conversations.filter((c) => c.needsReply).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="rounded-xl border border-sand-200 p-2 text-sand-700 hover:bg-sand-50"
            aria-label="Back to admin"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-sand-900">
              Live Chat
              <AdminNotificationBadge count={adminNotifyCounts.chat} />
            </h1>
            <p className="text-sm text-sand-600">
              {adminNotifyCounts.chat > 0
                ? `${adminNotifyCounts.chat} need attention`
                : 'Replies appear in chat and are emailed to the visitor'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Admin home
        </Button>
      </div>

      {setupRequired && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Chat database not set up yet</p>
          <p className="mt-1">This is why visitors see &quot;failed to start conversation&quot;. Create the tables first:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={runChatSetup} disabled={setupLoading}>
              {setupLoading ? 'Setting up…' : 'Auto-create tables'}
            </Button>
            {setupSql && (
              <Button size="sm" variant="outline" onClick={copySetupSql}>
                Copy SQL
              </Button>
            )}
          </div>
          {setupMessage && <p className="mt-2 text-xs">{setupMessage}</p>}
          {setupSql && (
            <p className="mt-2 text-xs text-amber-800">
              If auto-create fails, paste the copied SQL into Supabase → SQL Editor → Run.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-lg lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-sand-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-sand-100 px-4 py-3 font-bold text-sand-800">
            Conversations ({conversations.length})
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sand-500">
                <Loader2 className="animate-spin" size={18} />
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-sand-500">No chats yet.</p>
            ) : (
              conversations.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectConversation(row)}
                  className={`w-full border-b border-sand-50 px-4 py-3 text-left transition hover:bg-violet-50/60 ${
                    selectedId === row.id ? 'bg-violet-50 ring-1 ring-inset ring-violet-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-sand-900">{row.display_name}</p>
                      <p className="truncate text-xs text-sand-600">{row.email}</p>
                      {row.user_id && (
                        <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          Logged in
                        </span>
                      )}
                    </div>
                    {row.needsReply && (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" title="Needs reply" />
                    )}
                  </div>
                  {row.lastMessage && (
                    <p className="mt-1 truncate text-xs text-sand-500">{row.lastMessage.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-sand-400">
                    {formatTime(row.last_message_at || row.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sand-500">
              <MessageCircle size={40} className="text-sand-300" />
              <p>Select a conversation to reply</p>
            </div>
          ) : (
            <>
              <div className="border-b border-sand-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
                <p className="font-bold text-sand-900">{selectedMeta?.display_name}</p>
                <p className="text-sm text-sand-600">{selectedMeta?.email}</p>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-5">
                {loadingThread && messages.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-sand-400" size={24} />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            isAdmin
                              ? 'rounded-br-md bg-indigo-600 text-white'
                              : 'rounded-bl-md border border-sand-200 bg-sand-50 text-sand-900'
                          }`}
                        >
                          {!isAdmin && (
                            <p className="mb-1 text-xs font-bold text-sand-600">{selectedMeta?.display_name}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className={`mt-1 text-[10px] ${isAdmin ? 'text-indigo-200' : 'text-sand-500'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendReply} className="flex gap-2 border-t border-sand-100 p-4">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your reply…"
                  className="min-w-0 flex-1 rounded-xl border border-sand-200 px-4 py-3 outline-none ring-indigo-200 focus:ring-2"
                  maxLength={4000}
                />
                <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0 px-4">
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
