'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

export type NoticePriority = 'normal' | 'urgent' | 'info';

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string;
  priority: NoticePriority;
  publishAt: string;
  expireAt: string | null;
  createdAt: string;
  updatedAt: string;
  seenAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  viewCount: number;
  viewerCount: number;
  isSeen: boolean;
  isRead: boolean;
  isDismissed: boolean;
}

export interface NoticeSummary {
  total: number;
  unread_count: number;
  unseen_count: number;
  urgent_unread_count: number;
  notices: NoticeItem[];
  setupRequired?: boolean;
}

const emptySummary: NoticeSummary = {
  total: 0,
  unread_count: 0,
  unseen_count: 0,
  urgent_unread_count: 0,
  notices: [],
};

const API_NOTICES = '/api/me/notices';
const GUEST_STORAGE_KEY = 'global_notices_guest_state_v1';

type GuestState = {
  seen: Record<string, string>;
  read: Record<string, string>;
  dismissed: Record<string, string>;
};

function readGuestState(): GuestState {
  if (typeof window === 'undefined') return { seen: {}, read: {}, dismissed: {} };
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { seen: {}, read: {}, dismissed: {} };
    const parsed = JSON.parse(raw) as GuestState;
    return {
      seen: parsed && typeof parsed.seen === 'object' ? parsed.seen : {},
      read: parsed && typeof parsed.read === 'object' ? parsed.read : {},
      dismissed: parsed && typeof parsed.dismissed === 'object' ? parsed.dismissed : {},
    };
  } catch {
    return { seen: {}, read: {}, dismissed: {} };
  }
}

function writeGuestState(state: GuestState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyGuestStateToSummary(s: NoticeSummary): NoticeSummary {
  if (typeof window === 'undefined') return s;
  const gs = readGuestState();
  const noticesWithStatus = s.notices.map((n) => {
    const seenAt = gs.seen[n.id] || n.seenAt;
    const readAt = gs.read[n.id] || n.readAt;
    const dismissedAt = gs.dismissed[n.id] || n.dismissedAt;
    return {
      ...n,
      seenAt,
      readAt,
      dismissedAt,
      isSeen: n.isSeen || Boolean(seenAt),
      isRead: n.isRead || Boolean(readAt),
      isDismissed: n.isDismissed || Boolean(dismissedAt),
      viewCount: Number.isFinite(Number(n.viewCount)) ? Number(n.viewCount) : 0,
      viewerCount: Number.isFinite(Number(n.viewerCount)) ? Number(n.viewerCount) : 0,
    };
  });
  const notices = noticesWithStatus.filter((n) => !n.isDismissed);
  const total = notices.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of notices) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { ...s, total, unread_count, unseen_count, urgent_unread_count, notices };
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    const mod = await import('@/lib/auth-headers');
    const headers = await mod.getAuthFetchHeaders({
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string>) || {}),
    });
    return fetch(url, { ...init, credentials: init?.credentials || 'same-origin', headers });
  } catch {
    return fetch(url, { ...init, credentials: init?.credentials || 'same-origin' });
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 8) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function priorityBadge(p: NoticePriority) {
  switch (p) {
    case 'urgent':
      return { label: 'URGENT', className: 'bg-rose-500/10 text-rose-600 ring-rose-500/20' };
    case 'info':
      return { label: 'INFO', className: 'bg-sky-500/10 text-sky-700 ring-sky-500/20' };
    default:
      return { label: 'NOTICE', className: 'bg-amber-500/10 text-amber-700 ring-amber-500/20' };
  }
}

export const GlobalNoticeBell: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<NoticeSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);
  const panelOpenedForMarkSeenRef = useRef<Set<string>>(new Set());

  const unread = summary.unread_count ?? 0;
  const unseen = summary.unseen_count ?? 0;
  const hasUrgent = (summary.urgent_unread_count ?? 0) > 0;

  const fetchSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await authFetch(API_NOTICES + '?limit=30', {
        signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as Partial<NoticeSummary>;
      const next: NoticeSummary = {
        total: json.total ?? 0,
        unread_count: json.unread_count ?? 0,
        unseen_count: json.unseen_count ?? 0,
        urgent_unread_count: json.urgent_unread_count ?? 0,
        notices: Array.isArray(json.notices) ? (json.notices as NoticeItem[]) : [],
        setupRequired: !!json.setupRequired,
      };
      setSummary(applyGuestStateToSummary(next));
      setError(next.setupRequired ? 'Notices table not set up yet' : null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load notices');
    } finally {
      setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchSummary(ac.signal);
    return () => ac.abort();
  }, [fetchSummary]);

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 8_000) void fetchSummary();
    };
    window.addEventListener('focus', onFocus);
    const iv = setInterval(() => {
      void fetchSummary();
    }, 45_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(iv);
    };
  }, [fetchSummary]);

  // close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      const inBell = rootRef.current && t && rootRef.current.contains(t);
      const inPanel = panelRef.current && t && panelRef.current.contains(t);
      if (!inBell && !inPanel) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When panel opens:
  //   (A) mark "seen" for notices that haven't been seen yet (UI dedupe only),
  //   (B) ALWAYS send /seen POST for EVERY notice (increments the views counter on the server)
  //       — views are counted once per panel open, not skipped if already seen/read.
  useEffect(() => {
    if (!open) return;

    const allIds = summary.notices.map((n) => n.id);

    // (A) Optimistic "isSeen" UI update — only for notices never marked seen before
    //     (preserves the seen/read "unseen_count" reduction logic exactly as before)
    const toMarkSeenFirstTime = summary.notices
      .filter((n) => !n.isSeen && !panelOpenedForMarkSeenRef.current.has(n.id))
      .map((n) => n.id);
    if (toMarkSeenFirstTime.length > 0) {
      panelOpenedForMarkSeenRef.current = new Set([
        ...panelOpenedForMarkSeenRef.current,
        ...toMarkSeenFirstTime,
      ]);
      setSummary((s) => ({
        ...s,
        unseen_count: Math.max(0, s.unseen_count - toMarkSeenFirstTime.length),
        notices: s.notices.map((n) =>
          toMarkSeenFirstTime.includes(n.id)
            ? { ...n, isSeen: true, seenAt: new Date().toISOString() }
            : n
        ),
      }));
      const now = new Date().toISOString();
      const gs = readGuestState();
      for (const id of toMarkSeenFirstTime) gs.seen[id] = gs.seen[id] || now;
      writeGuestState(gs);
    }

    // (B) ALWAYS POST /seen for ALL notices to hit server-side view_count increment.
    //     Safe to call repeatedly — server increment runs on every request, and
    //     per-user global_notice_views rows are idempotently upserted.
    void (async () => {
      for (const id of allIds) {
        try {
          await authFetch(`${API_NOTICES}/${encodeURIComponent(id)}/seen`, {
            method: 'POST',
          });
        } catch {}
      }
    })();
  }, [open, summary.notices]);

  const markRead = async (id: string) => {
    setMarkingIds((s) => new Set(s).add(id));
    try {
      const res = await authFetch(`${API_NOTICES}/${encodeURIComponent(id)}/read`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const now = new Date().toISOString();
      const gs = readGuestState();
      gs.read[id] = now;
      gs.seen[id] = gs.seen[id] || now;
      writeGuestState(gs);
      setSummary((s) => {
        const item = s.notices.find((n) => n.id === id);
        const wasUnread = item && !item.isRead;
        const wasUnseen = item && !item.isSeen;
        return {
          ...s,
          unread_count: Math.max(0, s.unread_count - (wasUnread ? 1 : 0)),
          unseen_count: Math.max(0, s.unseen_count - (wasUnseen ? 1 : 0)),
          urgent_unread_count:
            wasUnread && item?.priority === 'urgent'
              ? Math.max(0, s.urgent_unread_count - 1)
              : s.urgent_unread_count,
          notices: s.notices.map((n) =>
            n.id === id ? { ...n, isRead: true, isSeen: true, readAt: new Date().toISOString(), seenAt: n.seenAt || new Date().toISOString() } : n
          ),
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to mark notice read');
    } finally {
      setMarkingIds((s) => {
        const n = new Set(s); n.delete(id); return n;
      });
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await authFetch(`${API_NOTICES}/read-all`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const now = new Date().toISOString();
      const gs = readGuestState();
      for (const n of summary.notices) {
        gs.read[n.id] = now;
        gs.seen[n.id] = gs.seen[n.id] || now;
      }
      writeGuestState(gs);
      setSummary((s) => ({
        ...s,
        unread_count: 0,
        unseen_count: 0,
        urgent_unread_count: 0,
        notices: s.notices.map((n) => ({ ...n, isRead: true, isSeen: true, readAt: now, seenAt: n.seenAt || now })),
      }));
    } catch (e: any) {
      setError(e?.message || 'Failed to mark all read');
    } finally {
      setMarkingAll(false);
    }
  };

  const dismissNotice = async (id: string) => {
    setDismissingIds((s) => new Set(s).add(id));
    try {
      const now = new Date().toISOString();
      const gs = readGuestState();
      gs.dismissed[id] = now;
      gs.read[id] = now;
      gs.seen[id] = gs.seen[id] || now;
      writeGuestState(gs);

      setSummary((s) => {
        const item = s.notices.find((n) => n.id === id);
        const wasUnread = item && !item.isRead;
        const wasUnseen = item && !item.isSeen;
        const next = {
          ...s,
          total: Math.max(0, s.total - (item ? 1 : 0)),
          unread_count: Math.max(0, s.unread_count - (wasUnread ? 1 : 0)),
          unseen_count: Math.max(0, s.unseen_count - (wasUnseen ? 1 : 0)),
          urgent_unread_count:
            wasUnread && item?.priority === 'urgent'
              ? Math.max(0, s.urgent_unread_count - 1)
              : s.urgent_unread_count,
          notices: s.notices.filter((n) => n.id !== id),
        };
        return next;
      });

      await authFetch(`${API_NOTICES}/${encodeURIComponent(id)}/dismiss`, {
        method: 'POST',
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to dismiss notice');
    } finally {
      setDismissingIds((s) => {
        const n = new Set(s); n.delete(id); return n;
      });
    }
  };

  const badgeRingClass = useMemo(() => {
    if (hasUrgent) return 'ring-rose-400/70';
    if (unseen > 0) return 'ring-amber-400/70';
    if (unread > 0) return 'ring-amber-300/60';
    return 'ring-transparent';
  }, [hasUrgent, unseen, unread]);

  const bellWrapperAnim = useMemo(() => {
    if (hasUrgent) return 'animate-pulse';
    return '';
  }, [hasUrgent]);

  const displayCount = unread > 0 ? unread : unseen > 0 ? unseen : 0;
  const badgeTone =
    hasUrgent
      ? 'bg-rose-500 text-white'
      : unread > 0
      ? 'bg-amber-500 text-white'
      : 'bg-sky-500 text-white';

  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalHost(document.body);
      try {
        let el = document.getElementById('bell-panel-mount') as HTMLElement | null;
        if (!el) {
          el = document.createElement('div');
          el.setAttribute('id', 'bell-panel-mount');
          document.body.appendChild(el);
        }
        setPortalHost(el);
      } catch {
        setPortalHost(document.body);
      }
    }
  }, []);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          displayCount > 0
            ? `Notifications · ${displayCount} unread`
            : 'Open notifications'
        }
        title={
          displayCount > 0
            ? `${displayCount} unread notification${displayCount === 1 ? '' : 's'}${
                hasUrgent ? ' · urgent' : ''
              }`
            : 'Notifications'
        }
        className={[
          'relative inline-flex items-center justify-center touch-target interactive-focus transition transition-bouncy',
          compact
            ? 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-300 bg-white shadow-sm text-slate-800 hover:bg-teal-50 hover:text-teal-700'
            : 'h-10 w-10 rounded-xl border-2 border-slate-300 bg-white shadow-md text-slate-800 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-400',
          hasUrgent
            ? 'ring-4 ring-rose-300/70 bg-rose-50 text-rose-700'
            : unread > 0
            ? 'ring-4 ring-amber-300/60'
            : '',
          bellWrapperAnim,
        ].join(' ')}
      >
        {hasUrgent && !reducedMotion && (
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-rose-400/50 animate-ping" aria-hidden />
        )}
        <Bell size={compact ? 18 : 20} strokeWidth={2} aria-hidden />
        {displayCount > 0 && (
          <span
            aria-hidden
            className={[
              'pointer-events-none absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-extrabold leading-none ring-2 ring-white shadow-md',
              badgeTone,
              badgeRingClass,
            ].join(' ')}
          >
            {displayCount > 99 ? '99+' : String(displayCount)}
          </span>
        )}
      </button>

      {portalHost &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="bell-scrim"
                  aria-hidden
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="sm:hidden fixed inset-0 z-[59] bg-slate-900/55 backdrop-blur-[2px]"
                />
                <motion.div
                  key="bell-panel"
                  ref={panelRef}
                  role="dialog"
                  aria-modal={true}
                  aria-label="Notifications"
                  initial={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.992 }}
                  animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.992 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={[
                    'sm:absolute sm:right-4 sm:top-16 sm:mt-0 sm:z-[60] sm:w-[22rem] md:w-[26rem]',
                    'fixed inset-x-0 bottom-0 z-[60] sm:inset-auto sm:bottom-auto',
                    'rounded-t-3xl sm:rounded-3xl border-x sm:border-2 border-t-2 border-slate-200 sm:border-slate-200',
                    'bg-white',
                    'shadow-[0_-22px_60px_-16px_rgba(15,23,42,0.45)] sm:shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35),0_6px_18px_-6px_rgba(15,23,42,0.22)]',
                    'overflow-hidden isolate flex flex-col',
                    'max-h-[88svh] sm:max-h-[70vh]',
                    'pb-[env(safe-area-inset-bottom,0px)]',
                  ].join(' ')}
                  style={{ transformOrigin: 'top right' }}
                >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-br from-teal-100 via-white to-amber-100">
              <div className="w-full flex items-start justify-center pt-1.5 pb-1 sm:hidden">
                <span
                  aria-hidden
                  className="block h-1.5 w-12 rounded-full bg-slate-300 shadow-inner"
                />
              </div>
            </div>
            <div className="sm:pt-0 px-4 pt-1 pb-3 border-b border-slate-200 bg-gradient-to-br from-teal-100 via-white to-amber-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">🔔</span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 leading-tight">
                    Notifications
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 truncate">
                    {error
                      ? error
                      : summary.total === 0
                      ? loading
                        ? 'Loading…'
                        : 'No notices right now'
                      : `${summary.total} notice${summary.total === 1 ? '' : 's'} · ${unread} unread`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(unread > 0 || unseen > 0) && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={markingAll}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-60 interactive-focus shadow-sm"
                  >
                    {markingAll ? (
                      <Loader2 size={12} className="animate-spin" aria-hidden />
                    ) : (
                      <CheckCheck size={12} aria-hidden />
                    )}
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (summary.notices.length === 0) return;
                    if (!window.confirm('Clear ALL notices from this bell? They will be hidden for you.')) return;
                    setSummary((s) => ({
                      ...s,
                      notices: [],
                      total: 0,
                      unread_count: 0,
                      unseen_count: 0,
                      urgent_unread_count: 0,
                    }));
                    if (typeof window !== 'undefined') {
                      try {
                        const gs = readGuestState();
                        const now = new Date().toISOString();
                        for (const n of summary.notices) {
                          gs.dismissed[n.id] = now;
                          gs.read[n.id] = now;
                          gs.seen[n.id] = gs.seen[n.id] || now;
                        }
                        writeGuestState(gs);
                      } catch {}
                    }
                    // Fire a dismiss call best-effort per notice for signed-in users (server persists)
                    void (async () => {
                      try {
                        for (const n of summary.notices) {
                          try {
                            await authFetch(`${API_NOTICES}/${encodeURIComponent(n.id)}/dismiss`, {
                              method: 'POST',
                            });
                          } catch { /* ignore per-notice */ }
                        }
                      } catch {}
                    })();
                  }}
                  disabled={summary.notices.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 interactive-focus shadow-sm"
                  title="Hide/clear all notices in this bell"
                  aria-label="Clear all notices"
                >
                  🗑️ Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 interactive-focus font-semibold"
                  aria-label="Close notifications"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 max-h-[calc(88svh-140px)] sm:max-h-[calc(70vh-140px)] overflow-y-auto bg-slate-50 overscroll-contain">
              {loading && summary.notices.length === 0 ? (
                <div className="px-4 py-6 flex items-center justify-center text-slate-600 text-sm gap-2 bg-white">
                  <Loader2 size={16} className="animate-spin text-teal-600" aria-hidden />
                  Loading notices…
                </div>
              ) : summary.notices.length === 0 ? (
                <div className="px-6 py-10 text-center bg-white">
                  <p className="text-4xl mb-2">🎉</p>
                  <p className="text-sm font-bold text-slate-900">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    New notices from the Kids Zone team will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 bg-white">
                  {summary.notices.map((n) => {
                    const badge = priorityBadge(n.priority);
                    const hasLink = Boolean(n.url);
                    const marking = markingIds.has(n.id);
                    const dismissing = dismissingIds.has(n.id);
                    return (
                      <li
                        key={n.id}
                        className={[
                          'relative px-4 py-3.5',
                          !n.isSeen
                            ? 'bg-gradient-to-r from-amber-50 via-white to-white'
                            : !n.isRead
                            ? 'bg-white'
                            : 'bg-slate-50',
                        ].join(' ')}
                      >
                        {!n.isSeen && !reducedMotion && (
                          <span className="pointer-events-none absolute left-0 top-0 bottom-0 w-[4px] rounded-r-full bg-gradient-to-b from-amber-400 via-rose-500 to-rose-600 animate-pulse" aria-hidden />
                        )}
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-2xl bg-white ring-2 ring-slate-200 shadow-sm">
                            {n.icon || '🔔'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                                    {n.title}
                                  </p>
                                  <span
                                    className={[
                                      'inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1',
                                      badge.className,
                                    ].join(' ')}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-semibold text-slate-600">
                                    {timeAgo(n.publishAt || n.createdAt)}
                                  </span>
                                  <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
                                  <time
                                    dateTime={(n.publishAt || n.createdAt)}
                                    className="text-[11px] font-medium text-slate-500"
                                    title={fmtDate(n.publishAt || n.createdAt)}
                                  >
                                    {fmtDate(n.publishAt || n.createdAt)}
                                  </time>
                                  <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
                                  <span
                                    title={`${Number(n.viewCount || 0).toLocaleString()} views · ${Number(n.viewerCount || 0).toLocaleString()} viewers`}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"
                                  >
                                    <Eye size={12} aria-hidden />
                                    {Number(n.viewerCount || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void markRead(n.id)}
                                  disabled={marking || n.isRead}
                                  title={n.isRead ? 'Read' : 'Mark as read'}
                                  aria-label={n.isRead ? 'Notice is read' : 'Mark notice as read'}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 ring-1 ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed interactive-focus"
                                >
                                  {marking ? (
                                    <Loader2 size={14} className="animate-spin text-teal-700" aria-hidden />
                                  ) : n.isRead ? (
                                    <CheckCheck size={16} className="text-teal-600" aria-hidden />
                                  ) : (
                                    <Check size={16} aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void dismissNotice(n.id)}
                                  disabled={dismissing}
                                  title="Delete / Hide this notification"
                                  aria-label="Delete notification"
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 ring-1 ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed interactive-focus"
                                >
                                  {dismissing ? (
                                    <Loader2 size={14} className="animate-spin text-rose-700" aria-hidden />
                                  ) : (
                                    <Trash2 size={15} aria-hidden />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                              {n.body}
                            </p>
                            {hasLink && (
                              <div className="mt-2.5">
                                <a
                                  href={n.url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100"
                                >
                                  Open link <ExternalLink size={12} aria-hidden />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 flex items-center justify-between gap-2">
              <Link
                href="/messages"
                className="text-[11.5px] font-bold text-slate-700 hover:text-teal-700 interactive-focus"
              >
                Open Messages inbox →
              </Link>
              <span className="text-[10.5px] font-medium text-slate-500">
                Auto-refreshes every 45s
              </span>
            </div>
          </motion.div>
          </>
            )}
          </AnimatePresence>,
          portalHost
        )}
    </div>
  );
};

export default GlobalNoticeBell;
