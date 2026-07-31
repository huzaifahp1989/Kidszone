'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Clock,
} from 'lucide-react';
import { AdminNotificationBadge } from '@/components/AdminNotificationBadge';
import { useAdminNotificationCounts } from '@/lib/use-admin-notification-counts';

type ManualStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

interface ManualSubmission {
  id: string;
  quiz_key: string;
  user_id: string;
  user_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  contact_number: string | null;
  status: ManualStatus;
  points_awarded: number;
  max_points_available: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  device_info: string | null;
  submitted_at: string;
  created_at: string;
}

const STATUS_TABS: Array<{ key: ManualStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function statusBadge(status: ManualStatus) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
          <Clock size={12} /> Pending
        </span>
      );
    case 'reviewing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-800">
          <Eye size={12} /> Reviewing
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
          <CheckCircle2 size={12} /> Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800">
          <XCircle size={12} /> Rejected
        </span>
      );
  }
}

export default function AdminManualQuizList() {
  const router = useRouter();
  const { counts: notifyCounts } = useAdminNotificationCounts(30000);
  const [rows, setRows] = useState<ManualSubmission[]>([]);
  const [counts, setCounts] = useState<Record<ManualStatus, number>>({
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ManualStatus | 'all'>('pending');
  const [quizFilter, setQuizFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (quizFilter) params.append('quizKey', quizFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      const url = `/api/admin/manual-quiz/submissions${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: { 'x-admin-auth': 'true' } });
      const data = await res.json();
      if (data?.tableMissing) {
        setTableMissing(true);
      }
      if (!res.ok) {
        setErrorMsg(data?.error || 'Failed to load');
      }
      setRows(Array.isArray(data?.submissions) ? (data.submissions as ManualSubmission[]) : []);
      if (data?.counts) setCounts(data.counts as Record<ManualStatus, number>);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, quizFilter, searchQuery]);

  useEffect(() => {
    const auth = typeof window !== 'undefined' && localStorage.getItem('admin_auth') === 'true';
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    fetchList();
  }, [fetchList, router]);

  useEffect(() => {
    const t = window.setTimeout(fetchList, 350);
    return () => window.clearTimeout(t);
  }, [fetchList]);

  useEffect(() => {
    const id = window.setInterval(fetchList, 30000);
    return () => window.clearInterval(id);
  }, [fetchList]);

  const visibleRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.user_name || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.contact_number || '').toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back to Admin
            </button>
            <h1 className="text-2xl font-black text-slate-900">🎯 Manual Quiz Submissions</h1>
            <AdminNotificationBadge count={notifyCounts.manualQuiz} />
          </div>
        </div>

        {tableMissing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <div>
                <p className="font-black">Setup SQL not applied</p>
                <p className="mt-1 text-sm">
                  The <code className="rounded bg-white px-1.5 py-0.5 text-xs">manual_quiz_submissions</code> and{' '}
                  <code className="rounded bg-white px-1.5 py-0.5 text-xs">manual_quiz_answers</code> tables are
                  missing. Run the Supabase SQL migration first.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(STATUS_TABS.filter((s) => s.key !== 'all') as Array<{ key: ManualStatus; label: string }>).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatusFilter(s.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === s.key
                  ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-white shadow-md ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{counts[s.key] ?? 0}</div>
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  statusFilter === t.key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
                {t.key !== 'all' ? (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px]">
                    {counts[t.key] ?? 0}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name / email / city / phone"
                className="w-72 max-w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <Filter size={14} className="ml-1.5 text-slate-400" />
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
                className="bg-transparent px-2 py-1.5 text-sm font-bold text-slate-800 outline-none"
              >
                <option value="">All quizzes</option>
                <option value="aug-2026-mixed">Aug 2026 Mixed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={fetchList}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null} Refresh
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-black">Child</th>
                <th className="px-4 py-3 text-left font-black">Quiz</th>
                <th className="px-4 py-3 text-left font-black">Status</th>
                <th className="px-4 py-3 text-left font-black">Points</th>
                <th className="px-4 py-3 text-left font-black">Submitted</th>
                <th className="px-4 py-3 text-right font-black">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 animate-spin text-indigo-500" size={22} />
                    <span className="font-semibold">Loading submissions…</span>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <MessageSquare className="mx-auto mb-2 text-slate-300" size={36} />
                    <p className="font-bold">No submissions match this filter</p>
                    <p className="mt-0.5 text-xs">Try switching tabs or clearing the search.</p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition hover:bg-indigo-50/60"
                    onClick={() => router.push(`/admin/manual-quiz/${r.id}`)}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-black text-slate-900">
                        {r.user_name || <span className="text-slate-400">No name</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {r.email ? <span>{r.email}</span> : null}
                        {r.contact_number ? (
                          <a
                            href={`https://wa.me/${String(r.contact_number).replace(/\D+/g, '')}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            📱 {r.contact_number}
                          </a>
                        ) : null}
                        {r.city ? <span>📍 {r.city}</span> : null}
                        {r.age ? <span>🎂 {r.age}y</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-bold text-indigo-800">
                        {r.quiz_key === 'aug-2026-mixed' ? '🎯 Aug 2026 Mixed' : r.quiz_key}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-black text-slate-900">
                        {r.points_awarded}
                        <span className="text-slate-400"> / {r.max_points_available}</span>
                      </div>
                      {r.status === 'approved' ? (
                        <div className="mt-0.5 text-[11px] font-bold text-emerald-700">
                          {r.max_points_available
                            ? `${Math.round((r.points_awarded / r.max_points_available) * 100)}%`
                            : '—'}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-700">
                        {new Date(r.submitted_at).toLocaleString()}
                      </div>
                      {r.reviewed_at ? (
                        <div className="mt-0.5 text-xs text-slate-400">
                          Reviewed {new Date(r.reviewed_at).toLocaleDateString()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/manual-quiz/${r.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        Review <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
