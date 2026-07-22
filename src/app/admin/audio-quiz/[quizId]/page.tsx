'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface AnswerItem {
  questionId: string;
  prompt: string;
  order: number;
  durationSeconds: number;
  audioUrl: string | null;
}

interface AdminSubmission {
  id: string;
  userName: string;
  age: number | null;
  status: string;
  place: number | null;
  judgeNotes: string;
  durationSeconds: number;
  submittedAt: string | null;
  audioUrl: string | null;
  audioPath: string;
  answers?: AnswerItem[];
}

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

export default function AdminAudioSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = String(params?.quizId || '');
  const [subs, setSubs] = React.useState<AdminSubmission[]>([]);
  const [counts, setCounts] = React.useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ quizId });
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/admin/audio-quiz/submissions?${qs.toString()}`, { headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setSubs(data.submissions || []);
      if (data.counts) setCounts(data.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [quizId, statusFilter]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    load();
  }, [router, load]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/audio-quiz/submissions', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMessage('Saved.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const download = async (audioUrl: string | null, name: string) => {
    if (!audioUrl) return;
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const ext = (audioUrl.split('?')[0].split('.').pop() || 'webm').slice(0, 4);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  };

  const exportCsv = () => {
    window.open(`/api/admin/audio-quiz/submissions?quizId=${encodeURIComponent(quizId)}&export=csv`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">Audio submissions</h1>
          <Link href="/admin/audio-quiz" className="text-sm font-bold text-violet-700 hover:underline">
            ← Quizzes
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 hover:bg-violet-50'
              }`}
            >
              {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
              {s === 'pending' ? ` (${counts.pending})` : s === 'approved' ? ` (${counts.approved})` : s === 'rejected' ? ` (${counts.rejected})` : ` (${counts.total})`}
            </button>
          ))}
          <button type="button" onClick={exportCsv} className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
            Export CSV
          </button>
        </div>

        {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : subs.length === 0 ? (
          <p className="text-slate-500">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {sub.userName}
                      {sub.age != null ? <span className="ml-1 text-sm font-normal text-slate-500">(age {sub.age})</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {sub.durationSeconds}s · {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('en-GB') : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      sub.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : sub.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {sub.status}
                    {sub.place ? ` · ${sub.place === 1 ? '1st' : sub.place === 2 ? '2nd' : sub.place === 3 ? '3rd' : `#${sub.place}`}` : ''}
                  </span>
                </div>

                {sub.answers && sub.answers.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {sub.answers.map((a, i) => (
                      <div key={a.questionId} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700">Q{i + 1}{a.prompt ? `: ${a.prompt}` : ''} · {a.durationSeconds}s</p>
                          {a.audioUrl ? (
                            <button type="button" onClick={() => download(a.audioUrl, `${sub.userName}-q${i + 1}-${sub.id}`)} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100">
                              Download
                            </button>
                          ) : null}
                        </div>
                        {a.audioUrl ? <audio controls src={a.audioUrl} className="mt-1 h-8 w-full" /> : <p className="text-xs text-rose-500">Audio unavailable</p>}
                      </div>
                    ))}
                  </div>
                ) : sub.audioUrl ? (
                  <audio controls src={sub.audioUrl} className="mt-3 w-full" />
                ) : (
                  <p className="mt-2 text-xs text-rose-500">No audio</p>
                )}

                <textarea
                  defaultValue={sub.judgeNotes}
                  placeholder="Judge notes (correctness, pronunciation, confidence, clarity, etiquette)…"
                  rows={2}
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  onBlur={(e) => {
                    if (e.target.value !== sub.judgeNotes) update(sub.id, { judgeNotes: e.target.value });
                  }}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => update(sub.id, { status: 'approved' })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700">
                    Approve
                  </button>
                  <button type="button" onClick={() => update(sub.id, { status: 'rejected' })} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-rose-700">
                    Reject
                  </button>
                  <span className="ml-2 text-sm font-semibold text-slate-600">Winner:</span>
                  {[1, 2, 3].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => update(sub.id, { status: 'approved', place: p })}
                      className={`rounded-lg px-2.5 py-1.5 text-sm font-bold ${
                        sub.place === p ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {p === 1 ? '🥇 1st' : p === 2 ? '🥈 2nd' : '🥉 3rd'}
                    </button>
                  ))}
                  {sub.place ? (
                    <button type="button" onClick={() => update(sub.id, { place: null })} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                      Clear place
                    </button>
                  ) : null}
                  {(!sub.answers || sub.answers.length === 0) && sub.audioUrl ? (
                    <button type="button" onClick={() => download(sub.audioUrl, `${sub.userName}-${sub.id}`)} className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                      Download
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
