'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminNotificationBadge } from '@/components/AdminNotificationBadge';
import { useAdminNotificationCounts } from '@/lib/use-admin-notification-counts';

type Submission = {
  id: string;
  user_id: string;
  user_name: string | null;
  email: string | null;
  chapter_number: number;
  answers: string[];
  auto_marks: number[];
  manual_marks: number[] | null;
  auto_score: number;
  finalScore: number;
  status: 'passed' | 'needs_improvement';
  admin_notes?: string | null;
  submitted_at: string;
};

type LeaderboardRow = {
  userId: string;
  userName: string;
  email: string;
  totalScore: number;
  passedChapters: number;
  submittedChapters: number;
  averageScore: number;
};

export default function AdminSeerahPage() {
  const router = useRouter();
  const { counts: adminNotifyCounts } = useAdminNotificationCounts(15000);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardRow[]>([]);
  const [chapterFilter, setChapterFilter] = React.useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'passed' | 'needs_improvement'>('all');
  const [selected, setSelected] = React.useState<Submission | null>(null);
  const [manualMarks, setManualMarks] = React.useState<number[]>([0, 0, 0, 0, 0]);
  const [adminNotes, setAdminNotes] = React.useState('');
  const [setupRequired, setSetupRequired] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadError(null);
    setSetupRequired(false);
    try {
      const res = await fetch('/api/admin/seerah/submissions', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (!res.ok) {
        setLoadError(data?.error || `Server error ${res.status}`);
        return;
      }
      setSubmissions(data.submissions || []);
      setLeaderboard(data.leaderboard || []);
    } catch (e: any) {
      setLoadError(e?.message || 'Network error');
    }
  }, []);

  React.useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
      return;
    }
    void load();
  }, [router, load]);

  const openReview = (row: Submission) => {
    setSelected(row);
    const base = Array.isArray(row.manual_marks) && row.manual_marks.length === 5
      ? row.manual_marks
      : Array.isArray(row.auto_marks) && row.auto_marks.length === 5
      ? row.auto_marks
      : [0, 0, 0, 0, 0];
    setManualMarks(base.map((v) => Number(v || 0)));
    setAdminNotes(String(row.admin_notes || ''));
  };

  const saveReview = async () => {
    if (!selected) return;
    const res = await fetch('/api/admin/seerah/submissions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': 'true',
      },
      body: JSON.stringify({ id: selected.id, manualMarks, adminNotes }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not save marks.');
      return;
    }
    setSelected(null);
    await load();
  };

  const exportCsv = async () => {
    const res = await fetch('/api/admin/seerah/submissions?format=csv', {
      headers: { 'x-admin-auth': 'true' },
    });
    if (!res.ok) {
      alert('Could not export CSV.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seerah-submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = submissions.filter((row) => {
    if (chapterFilter !== 'all' && Number(chapterFilter) !== Number(row.chapter_number)) return false;
    if (statusFilter !== 'all' && statusFilter !== row.status) return false;
    return true;
  });

  const usersProgress = React.useMemo(() => {
    const map = new Map<string, { name: string; submitted: Set<number>; passed: Set<number> }>();
    for (const row of submissions) {
      const key = row.user_id;
      const existing = map.get(key) || { name: row.user_name || 'Learner', submitted: new Set<number>(), passed: new Set<number>() };
      existing.submitted.add(Number(row.chapter_number));
      if (row.status === 'passed') existing.passed.add(Number(row.chapter_number));
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([userId, value]) => ({
      userId,
      name: value.name,
      completedCount: value.submitted.size,
      passedCount: value.passed.size,
    }));
  }, [submissions]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">Admin • Seerah</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-black text-slate-900">
            Seerah Submissions Review
            <AdminNotificationBadge count={adminNotifyCounts.seerah} />
          </h1>
          <p className="mt-2 text-sm text-slate-600">Review descriptive answers, adjust marks, export CSV, and monitor completion.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-bold" onClick={exportCsv}>Export CSV</button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700" onClick={load}>↻ Refresh</button>
            <a href="/seerah" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Open Seerah Course</a>
            <a href="/admin/setup" className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-bold text-amber-700">DB Setup</a>
          </div>
        </div>

        {setupRequired && (
          <div className="rounded-2xl bg-red-50 border border-red-300 p-5">
            <p className="font-black text-red-800 text-lg">❌ Seerah tables are not set up in the database</p>
            <p className="mt-2 text-sm text-red-700">The <code>seerah_quiz_submissions</code> table is missing. Go to <a href="/admin/setup" className="underline font-bold">Admin → DB Setup</a> and click <strong>Create Tables</strong>, or run the SQL from the previous step in Supabase.</p>
          </div>
        )}

        {loadError && !setupRequired && (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5">
            <p className="font-black text-amber-800">⚠️ Could not load submissions</p>
            <p className="mt-1 text-sm text-amber-700">{loadError}</p>
            <button className="mt-3 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-bold" onClick={load}>Retry</button>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="text-xl font-black text-slate-900">Leaderboard</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">User</th>
                  <th className="py-2">Total Score</th>
                  <th className="py-2">Avg</th>
                  <th className="py-2">Passed</th>
                  <th className="py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.userId} className="border-t">
                    <td className="py-2 font-semibold text-slate-800">{row.userName}</td>
                    <td className="py-2">{row.totalScore}</td>
                    <td className="py-2">{row.averageScore}</td>
                    <td className="py-2">{row.passedChapters}/5</td>
                    <td className="py-2">{row.submittedChapters}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="text-xl font-black text-slate-900">User Completion</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {usersProgress.map((row) => (
              <div key={row.userId} className="rounded-xl border border-slate-200 p-3">
                <p className="font-bold text-slate-900">{row.name}</p>
                <p className="text-sm text-slate-600">Completed: {row.completedCount}/5 • Passed: {row.passedCount}/5</p>
              </div>
            ))}
            {!usersProgress.length ? <p className="text-sm text-slate-500">No Seerah users yet.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Chapter</label>
              <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value as any)} className="mt-1 block rounded-lg border border-slate-300 p-2">
                <option value="all">All</option>
                <option value="1">Chapter 1</option>
                <option value="2">Chapter 2</option>
                <option value="3">Chapter 3</option>
                <option value="4">Chapter 4</option>
                <option value="5">Chapter 5</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="mt-1 block rounded-lg border border-slate-300 p-2">
                <option value="all">All</option>
                <option value="passed">Passed</option>
                <option value="needs_improvement">Needs Improvement</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">User</th>
                  <th className="py-2">Chapter</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Submitted</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-2">{row.user_name || 'Learner'}<div className="text-xs text-slate-500">{row.email || ''}</div></td>
                    <td className="py-2">{row.chapter_number}</td>
                    <td className="py-2">{row.finalScore}/100</td>
                    <td className="py-2">{row.status === 'passed' ? 'Passed' : 'Needs Improvement'}</td>
                    <td className="py-2">{new Date(row.submitted_at).toLocaleString()}</td>
                    <td className="py-2">
                      <button className="rounded-lg border border-slate-300 px-3 py-1 font-semibold" onClick={() => openReview(row)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="py-3 text-slate-500" colSpan={6}>No submissions found for this filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-auto">
          <div className="max-w-3xl mx-auto rounded-2xl bg-white p-5 space-y-4">
            <h3 className="text-xl font-black text-slate-900">Review Submission • Chapter {selected.chapter_number}</h3>
            <p className="text-sm text-slate-600">{selected.user_name || 'Learner'} ({selected.email || 'no email'})</p>

            {selected.answers.map((answer, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Answer {idx + 1}</p>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{answer}</p>
                <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Manual Mark (0-20)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={manualMarks[idx] ?? 0}
                  onChange={(e) => {
                    const next = [...manualMarks];
                    next[idx] = Number(e.target.value || 0);
                    setManualMarks(next);
                  }}
                  className="mt-1 rounded-lg border border-slate-300 p-2 w-28"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Admin Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="rounded-lg bg-teal-600 text-white px-4 py-2 font-bold" onClick={saveReview}>
                Save Marks
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
