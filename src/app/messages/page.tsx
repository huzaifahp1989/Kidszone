'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import { useAuth } from '@/lib/auth-context';

type UserMessage = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  source: string;
  sentBy: string;
  createdAt: string;
  readAt: string | null;
  isUnread: boolean;
};

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch('/api/user/messages', { headers, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load messages');
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    void loadMessages();
  }, [user?.id]);

  const markRead = async (messageId: string) => {
    try {
      const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
      await fetch(`/api/user/messages/${messageId}/read`, { method: 'POST', headers, cache: 'no-store' });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, readAt: new Date().toISOString(), isUnread: false } : message
        )
      );
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="page-inner py-10 text-center text-slate-600">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="page-inner py-12 text-center">
        <h1 className="text-2xl font-black text-slate-900">Messages</h1>
        <p className="mt-3 text-slate-600">Please sign in to read your updates.</p>
        <Link href="/signin?next=%2Fmessages" className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2 font-bold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="page-inner max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-700">Inbox</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Messages</h1>
        </div>
        <div className="rounded-full bg-purple-50 px-3 py-1 text-sm font-bold text-purple-700">
          {messages.filter((m) => m.isUnread).length} unread
        </div>
      </div>

      {loadingMessages ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Loading your messages...</div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          No messages yet. New updates from admins will appear here and also through push notifications.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <article key={message.id} className={`rounded-2xl border p-5 shadow-sm ${message.isUnread ? 'border-purple-200 bg-purple-50/60' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{message.source}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{message.title}</h2>
                </div>
                {message.isUnread ? (
                  <span className="rounded-full bg-purple-600 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">New</span>
                ) : null}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>{new Date(message.createdAt).toLocaleString()}</span>
                {message.url ? (
                  <Link href={message.url} className="font-bold text-purple-700 hover:underline" onClick={() => markRead(message.id)}>
                    Open
                  </Link>
                ) : (
                  <button type="button" className="font-bold text-purple-700 hover:underline" onClick={() => markRead(message.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
