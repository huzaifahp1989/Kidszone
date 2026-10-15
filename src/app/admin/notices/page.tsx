'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

type NoticePriority = 'normal' | 'urgent' | 'info';

type AdminNotice = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string;
  priority: NoticePriority;
  active: boolean;
  created_by: string | null;
  publish_at: string;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
  view_count?: number | null;
  viewer_count?: number | null;
};

const ICON_PRESETS: Array<string> = [
  '🔔','📢','🎉','📚','🕌','⭐','🏆','🎁','🧠','🎮','📖','💚','📿','🌙','🏅','🎧','📝','🧩','✨','🏠'
];

const toDTLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function statusFor(n: AdminNotice): { label: string; cls: string } {
  const now = Date.now();
  const pub = new Date(n.publish_at).getTime();
  const exp = n.expire_at ? new Date(n.expire_at).getTime() : null;
  if (!n.active) return { label: 'Draft', cls: 'bg-slate-100 text-slate-700 ring-slate-200' };
  if (now < pub) return { label: 'Scheduled', cls: 'bg-sky-100 text-sky-800 ring-sky-200' };
  if (exp && now >= exp) return { label: 'Expired', cls: 'bg-slate-100 text-slate-500 ring-slate-200' };
  return { label: 'Live', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' };
}

function priorityBadge(p: NoticePriority) {
  switch (p) {
    case 'urgent':
      return { label: 'Urgent', cls: 'bg-rose-100 text-rose-700 ring-rose-200' };
    case 'info':
      return { label: 'Info', cls: 'bg-sky-100 text-sky-700 ring-sky-200' };
    default:
      return { label: 'Normal', cls: 'bg-amber-100 text-amber-800 ring-amber-200' };
  }
}

export default function AdminNoticesPage() {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [icon, setIcon] = React.useState<string>('🔔');
  const [priority, setPriority] = React.useState<NoticePriority>('normal');
  const [activeInForm, setActiveInForm] = React.useState<boolean>(true);
  const [publishAt, setPublishAt] = React.useState<string>(toDTLocal(new Date().toISOString()));
  const [expireAt, setExpireAt] = React.useState<string>('');
  const [notices, setNotices] = React.useState<AdminNotice[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [setupRequired, setSetupRequired] = React.useState<boolean>(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setUrl('');
    setIcon('🔔');
    setPriority('normal');
    setActiveInForm(true);
    setPublishAt(toDTLocal(new Date().toISOString()));
    setExpireAt('');
  };

  React.useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
      return;
    }
    void load();
  }, [router]);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/notices', {
        headers: { 'x-admin-auth': 'true' },
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotices(Array.isArray(j.notices) ? j.notices : []);
      } else if (j?.setupRequired) {
        setSetupRequired(true);
      }
    } catch {}
  };

  React.useEffect(() => {
    if (!setupRequired) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [setupRequired]);

  const submit = async (activate: boolean) => {
    if (!title.trim() || !body.trim()) {
      alert('Title and body are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: title.trim(),
        body: body.trim(),
        url: url.trim() ? url.trim() : null,
        icon: icon || '🔔',
        priority,
        active: activate,
        publish_at: publishAt ? new Date(publishAt).toISOString() : new Date().toISOString(),
        expire_at: expireAt ? new Date(expireAt).toISOString() : null,
      };
      const res = await fetch('/api/admin/notices', {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      const returned: AdminNotice = j.notice;
      if (editingId) {
        setNotices((prev) => prev.map((n) => (n.id === editingId ? returned : n)));
        alert('Notice updated');
      } else {
        setNotices((prev) => [returned, ...prev]);
        alert(activate ? 'Notice published live' : 'Notice saved as draft');
      }
      resetForm();
    } catch (e: any) {
      alert(e?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (n: AdminNotice, next: boolean) => {
    setLoading(true);
    try {
      const payload = { id: n.id, title: n.title, body: n.body, active: next, publish_at: n.publish_at };
      const res = await fetch('/api/admin/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed');
      setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, active: next } : x)));
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (n: AdminNotice) => {
    setEditingId(n.id);
    setTitle(n.title || '');
    setBody(n.body || '');
    setUrl(n.url || '');
    setIcon(n.icon || '🔔');
    setPriority(n.priority || 'normal');
    setActiveInForm(Boolean(n.active));
    setPublishAt(toDTLocal(n.publish_at));
    setExpireAt(toDTLocal(n.expire_at));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this notice site-wide? It will be removed from every bell icon and user (cannot be undone).')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notices?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to delete');
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const summaryCounts = React.useMemo(() => {
    const live = notices.filter((n) => statusFor(n).label === 'Live').length;
    const scheduled = notices.filter((n) => statusFor(n).label === 'Scheduled').length;
    const urgentLive = notices.filter((n) => statusFor(n).label === 'Live' && n.priority === 'urgent').length;
    const totalViews = notices.reduce((acc, n) => acc + Number(n.view_count ?? 0), 0);
    const totalViewers = notices.reduce((acc, n) => acc + Number(n.viewer_count ?? 0), 0);
    return { live, scheduled, urgentLive, total: notices.length, totalViews, totalViewers };
  }, [notices]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Admin · Notifications
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            🔔 Site-wide Notices
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create notices that appear instantly in the bell icon on every page. Urgent notices
            flash red on the user&apos;s screen until they open them.
          </p>
        </header>

        {setupRequired && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold text-amber-900">
              Migration not applied yet
            </p>
            <p className="text-amber-800 mt-1">
              The <code className="bg-white/70 rounded px-1">global_notices</code> tables don&apos;t
              exist yet in this Supabase project. Run the migration SQL to continue.
            </p>
            <p className="text-amber-800 mt-2 text-xs">
              Migration file: <code>supabase/migrations/20260829_create_global_notices.sql</code>
              {' '}(applies <code>global_notices</code> + <code>global_notice_views</code> + RLS policies + triggers).
            </p>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 mb-6">
          {[
            { title: 'Total notices', value: summaryCounts.total, tone: 'bg-white border-slate-200 text-slate-800' },
            { title: 'Live now', value: summaryCounts.live, tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
            { title: 'Scheduled', value: summaryCounts.scheduled, tone: 'bg-sky-50 border-sky-200 text-sky-800' },
            { title: 'Urgent live', value: summaryCounts.urgentLive, tone: 'bg-rose-50 border-rose-200 text-rose-800' },
            { title: 'Total views', value: summaryCounts.totalViews, tone: 'bg-amber-50 border-amber-200 text-amber-900' },
            { title: 'Total viewers', value: summaryCounts.totalViewers, tone: 'bg-violet-50 border-violet-200 text-violet-900' },
          ].map((c) => (
            <div key={c.title} className={`rounded-2xl border shadow-sm ${c.tone} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{c.title}</p>
              <p className="text-2xl font-extrabold mt-1">{c.value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingId ? 'Edit notice' : 'Create new notice'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. New weekly competition is live!"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">{title.length}/200</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Write your notice here. Kids see this under the bell icon."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-y"
                />
                <p className="mt-1 text-[11px] text-slate-500">{body.length}/2000</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Link URL (optional)
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://… (opens in new tab)"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Icon
                  </label>
                  <div className="mt-1">
                    <input
                      value={icon}
                      maxLength={4}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-2xl text-center"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ICON_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setIcon(p)}
                          className={`h-8 w-8 rounded-lg text-lg ring-1 transition ${
                            icon === p
                              ? 'bg-teal-100 ring-teal-400 shadow-sm scale-105'
                              : 'bg-white ring-slate-200 hover:bg-slate-50'
                          }`}
                          aria-label={`Use icon ${p}`}
                          title={p}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'info', label: 'Info', cls: 'ring-sky-300 text-sky-700 bg-sky-50' },
                        { id: 'normal', label: 'Normal', cls: 'ring-amber-300 text-amber-800 bg-amber-50' },
                        { id: 'urgent', label: 'Urgent', cls: 'ring-rose-300 text-rose-700 bg-rose-50' },
                      ] as Array<{ id: NoticePriority; label: string; cls: string }>
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`rounded-xl px-2 py-2 text-[11px] font-extrabold uppercase tracking-wider ring-1 transition ${
                          priority === p.id
                            ? p.cls + ' shadow scale-[1.02]'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                    <b>Urgent</b> = red flashing bell + red ring until user opens panel.
                    <br />
                    <b>Normal</b> = amber highlight on bell when unread.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Publish at
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Expire at (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expireAt}
                    onChange={(e) => setExpireAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Active (live to users)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Publish/schedule window must also be open for users to see it.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded accent-teal-600"
                    checked={activeInForm}
                    onChange={(e) => setActiveInForm(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-700">{activeInForm ? 'On' : 'Off'}</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void submit(true)}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  {editingId ? 'Save & publish' : 'Publish live'}
                </button>
                <button
                  type="button"
                  onClick={() => void submit(false)}
                  disabled={loading}
                  className="rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  {editingId ? 'Save as draft' : 'Save as draft'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  Reset form
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-extrabold text-slate-900">All notices</h2>
              <span className="text-xs text-slate-500">{notices.length} total</span>
            </div>
            {notices.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-4xl mb-2">🔔</p>
                <p className="font-bold text-slate-800">No notices yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create your first site notice on the left.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {notices.map((n) => {
                  const status = statusFor(n);
                  const pBadge = priorityBadge(n.priority);
                  return (
                    <li key={n.id} className="px-5 py-4 hover:bg-slate-50/60 transition">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl">
                          {n.icon || '🔔'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900 leading-tight truncate">
                              {n.title}
                            </p>
                            <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1 ${status.cls}`}>
                              {status.label}
                            </span>
                            <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1 ${pBadge.cls}`}>
                              {pBadge.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-slate-700 line-clamp-2 whitespace-pre-wrap break-words">
                            {n.body}
                          </p>
                          {n.url && (
                            <p className="mt-1 text-xs text-teal-700 truncate">
                              🔗 {n.url}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 ring-1 ring-violet-200 text-violet-900 font-extrabold">
                              👁️ Views: {Number(n.view_count ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 ring-1 ring-violet-200 text-violet-900 font-extrabold">
                              👥 Viewers: {Number(n.viewer_count ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 ring-1 ring-emerald-200 text-emerald-800 font-semibold">
                              📅 Publish: {fmtDate(n.publish_at)}
                            </span>
                            {n.expire_at && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 ring-1 ring-sky-200 text-sky-800 font-semibold">
                                ⏳ Expire: {fmtDate(n.expire_at)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200 text-slate-700 font-semibold">
                              ✅ Created: {fmtDate(n.created_at)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(n)}
                              className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            {status.label === 'Live' ? (
                              <button
                                type="button"
                                onClick={() => void toggleActive(n, false)}
                                className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-50"
                              >
                                Pause (deactivate)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void toggleActive(n, true)}
                                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700"
                              >
                                Activate now
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void remove(n.id)}
                              className="ml-auto rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
