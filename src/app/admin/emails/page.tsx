'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, RefreshCw, Search, Send, Users } from 'lucide-react';
import { Button } from '@/components';
import { buildEmailTemplate } from '@/lib/admin-email';

type Audience = 'kids' | 'other';

type Recipient = {
  uid: string;
  name: string;
  email: string;
  createdAt: string | null;
  audience: Audience;
};

type Transport = 'gmail' | 'resend' | 'none';

type AudienceFilter = 'all' | Audience;

const AUDIENCE_FILTERS: { key: AudienceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'kids', label: 'Kids Zone' },
  { key: 'other', label: 'Other' },
];

const SEND_AS_OPTIONS = [
  { key: 'central', label: 'Islam Media Central' },
  { key: 'kids', label: 'Kids Zone' },
];

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function messageToHtml(message: string): string {
  return message
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function AdminEmailsPage() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [counts, setCounts] = useState({ all: 0, kids: 0, other: 0 });
  const [transport, setTransport] = useState<Transport>('none');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [sendAs, setSendAs] = useState('central');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/send-email', { headers: { 'x-admin-auth': 'true' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load recipients');
      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      setCounts({
        all: Number(data.counts?.all) || 0,
        kids: Number(data.counts?.kids) || 0,
        other: Number(data.counts?.other) || 0,
      });
      setTransport((data.transport as Transport) || 'none');
      setSender(data.sender || '');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load recipients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    void load();
  }, [router, load]);

  const audienceRecipients = useMemo(
    () => (audience === 'all' ? recipients : recipients.filter((r) => r.audience === audience)),
    [recipients, audience]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return audienceRecipients;
    return audienceRecipients.filter(
      (r) => r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [audienceRecipients, search]);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    const uids = filtered.map((r) => r.uid);
    setSelected((prev) => {
      const allSelected = uids.every((uid) => prev.has(uid));
      const next = new Set(prev);
      uids.forEach((uid) => (allSelected ? next.delete(uid) : next.add(uid)));
      return next;
    });
  };

  const selectAudience = () => {
    setSelected(new Set(audienceRecipients.map((r) => r.uid)));
  };

  const audienceLabel = AUDIENCE_FILTERS.find((f) => f.key === audience)?.label || 'All';
  const fromName = SEND_AS_OPTIONS.find((o) => o.key === sendAs)?.label || 'Islam Media Central';

  const send = async (mode: 'selected' | 'audience') => {
    setResult(null);

    if (!subject.trim()) {
      setResult({ ok: false, text: 'Add a subject before sending.' });
      return;
    }
    if (!message.trim()) {
      setResult({ ok: false, text: 'Write a message before sending.' });
      return;
    }

    const userIds = recipients.filter((r) => selected.has(r.uid)).map((r) => r.uid);
    if (mode === 'selected' && userIds.length === 0) {
      setResult({ ok: false, text: 'Select at least one recipient.' });
      return;
    }

    const targetCount = mode === 'audience' ? audienceRecipients.length : userIds.length;
    const targetLabel = mode === 'audience' ? `${audienceLabel} (${targetCount})` : `${targetCount} selected`;
    if (targetCount === 0) {
      setResult({ ok: false, text: 'No recipients in this selection.' });
      return;
    }

    const confirmText = `Send this email to ${targetLabel} as "${fromName}" via ${
      sender || transport
    }?`;
    if (typeof window !== 'undefined' && !window.confirm(confirmText)) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          audience: mode === 'audience' ? audience : undefined,
          userIds: mode === 'audience' ? undefined : userIds,
          fromName: sendAs,
          subject: subject.trim(),
          html: buildEmailTemplate(messageToHtml(message)),
          text: message.trim(),
          ...(replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send emails');

      const warning = data.warning ? ` (${data.warning})` : '';
      setResult({ ok: true, text: `${data.message || 'Emails sent'}${warning}` });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : 'Failed to send emails' });
    } finally {
      setSending(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.uid));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800">
            <Mail className="h-6 w-6 text-violet-600" /> Email Users
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All signup emails from Supabase — send to everyone, a group, or pick individuals.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {transport === 'none' && !loading && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No sender is configured. Add <code className="font-mono">EMAIL_USER</code> and{' '}
          <code className="font-mono">EMAIL_PASS</code> (Gmail app password) to your environment to
          send as imediac786@gmail.com.
        </div>
      )}

      {transport !== 'none' && !loading && (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Sending via <strong>{transport === 'gmail' ? 'Gmail' : 'Resend'}</strong> from{' '}
          <strong>imediac786@gmail.com</strong> — the name shown to recipients is chosen below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Compose</h2>

          <label className="mb-1 block text-sm font-semibold text-slate-700">Send as</label>
          <select
            value={sendAs}
            onChange={(e) => setSendAs(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            {SEND_AS_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-sm font-semibold text-slate-700">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New competitions this week"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />

          <label className="mb-1 block text-sm font-semibold text-slate-700">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            placeholder={'Assalamu Alaikum,\n\nWrite your message here…'}
            className="mb-4 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />

          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Reply-to <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="imediac786@gmail.com"
            className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              className="justify-center"
              disabled={sending || audienceRecipients.length === 0}
              onClick={() => void send('audience')}
            >
              <Users className="h-4 w-4" />
              {sending ? 'Sending…' : `Send to ${audienceLabel} (${audienceRecipients.length})`}
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              disabled={sending || selected.size === 0}
              onClick={() => void send('selected')}
            >
              <Send className="h-4 w-4" />
              Send to selected ({selected.size})
            </Button>
          </div>

          {result && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                result.ok
                  ? 'bg-teal-50 text-teal-900 border border-teal-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="whitespace-pre-wrap">{result.text}</span>
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Signups <span className="text-sm font-medium text-slate-400">({filtered.length})</span>
            </h2>
            <button
              type="button"
              onClick={toggleAllFiltered}
              className="text-sm font-semibold text-violet-600 hover:underline"
            >
              {allFilteredSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {AUDIENCE_FILTERS.map((filter) => {
              const active = audience === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setAudience(filter.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label} ({counts[filter.key]})
                </button>
              );
            })}
            <button
              type="button"
              onClick={selectAudience}
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-bold text-violet-600 hover:underline"
            >
              Select this group
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading recipients…</p>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-red-600">{loadError}</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No signups found.</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((r) => {
                const checked = selected.has(r.uid);
                return (
                  <li key={r.uid || r.email}>
                    <label className="flex cursor-pointer items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(r.uid)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {r.name}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              r.audience === 'kids'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {r.audience === 'kids' ? 'Kids Zone' : 'Other'}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">{r.email}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
