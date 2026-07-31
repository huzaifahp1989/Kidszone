'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Minus,
  ThumbsUp,
  ThumbsDown,
  Award,
  Mail,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Save,
  Eye,
  MessageSquare,
} from 'lucide-react';

type ManualStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';
type AnswerStatus = 'pending' | 'correct' | 'partial' | 'incorrect' | 'skipped';

interface AnswerRow {
  id: string;
  submission_id: string;
  question_id: string;
  question_topic: string | null;
  question_prompt: string;
  reference_answer: string | null;
  answer_text: string;
  judge_status: AnswerStatus;
  points_awarded: number;
  max_points: number;
  judge_notes: string | null;
  judged_at: string | null;
  created_at: string | null;
}

interface SubmissionDetail {
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
  answers: AnswerRow[];
}

const JUDGE_OPTIONS: Array<{ key: AnswerStatus; label: string; color: string; icon: React.ReactNode }> = [
  { key: 'correct', label: 'Correct', color: 'emerald', icon: <CheckCircle2 size={14} /> },
  { key: 'partial', label: 'Partial', color: 'amber', icon: <Minus size={14} /> },
  { key: 'incorrect', label: 'Incorrect', color: 'rose', icon: <XCircle size={14} /> },
  { key: 'skipped', label: 'Skipped', color: 'slate', icon: <Eye size={14} /> },
  { key: 'pending', label: 'Reset', color: 'slate', icon: <AlertCircle size={14} /> },
];

function statusClass(key: AnswerStatus): string {
  switch (key) {
    case 'correct':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    case 'partial':
      return 'bg-amber-500 hover:bg-amber-600 text-white';
    case 'incorrect':
      return 'bg-rose-500 hover:bg-rose-600 text-white';
    case 'skipped':
      return 'bg-slate-400 hover:bg-slate-500 text-white';
    case 'pending':
    default:
      return 'bg-slate-200 hover:bg-slate-300 text-slate-800';
  }
}

export default function AdminManualQuizDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState<ManualStatus | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const fetchDetail = useCallback(async (submissionId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/manual-quiz/submissions/${submissionId}`, {
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || 'Failed to load');
        if (data?.tableMissing) setErrorMsg('Setup SQL not applied yet.');
        return;
      }
      setDetail(data as SubmissionDetail);
      if (data?.admin_notes) setAdminNotes(String(data.admin_notes));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const auth = typeof window !== 'undefined' && localStorage.getItem('admin_auth') === 'true';
    if (!auth) {
      router.push('/admin/login');
      return;
    }
    if (id) fetchDetail(id);
  }, [fetchDetail, id, router]);

  const judgeAnswer = async (
    answerId: string,
    judgeStatus: AnswerStatus,
    customPoints?: number,
    customNotes?: string
  ) => {
    if (!detail) return;
    const current = detail.answers.find((a) => a.id === answerId);
    if (!current) return;
    const defaultPoints =
      judgeStatus === 'correct'
        ? current.max_points
        : judgeStatus === 'partial'
          ? Math.ceil(current.max_points / 2)
          : 0;
    const points = typeof customPoints === 'number' ? customPoints : defaultPoints;
    const notes = customNotes ?? current.judge_notes;

    setActing(answerId);
    try {
      const res = await fetch(
        `/api/admin/manual-quiz/submissions/${detail.id}/answers/${answerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
          body: JSON.stringify({
            judgeStatus,
            pointsAwarded: points,
            judgeNotes: notes,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to judge');
      if (data?.submission) setDetail(data.submission as SubmissionDetail);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark');
    } finally {
      setActing(null);
    }
  };

  const updatePoints = async (answerId: string, newPoints: number) => {
    if (!detail) return;
    const current = detail.answers.find((a) => a.id === answerId);
    if (!current) return;
    const clamped = Math.max(0, Math.min(current.max_points, Math.round(newPoints || 0)));
    await judgeAnswer(answerId, current.judge_status === 'pending' ? 'partial' : current.judge_status, clamped);
  };

  const updateNotes = async (answerId: string, newNotes: string) => {
    if (!detail) return;
    const current = detail.answers.find((a) => a.id === answerId);
    if (!current) return;
    await judgeAnswer(answerId, current.judge_status, current.points_awarded, newNotes);
  };

  const finalize = async (newStatus: 'approved' | 'rejected' | 'reviewing') => {
    if (!detail) return;
    setFinalizing(newStatus);
    try {
      const res = await fetch(`/api/admin/manual-quiz/submissions/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ newStatus, adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      if (data?.detail) setDetail(data.detail as SubmissionDetail);
      if (typeof data?.pointsAwardedNow === 'number' && newStatus === 'approved') {
        alert(
          `✅ Approved! +${data.pointsAwardedNow} points awarded (daily cap respected). Total on submission: ${data.detail?.points_awarded ?? 0}`
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFinalizing(null);
    }
  };

  const rollup = React.useMemo(() => {
    if (!detail) return { awarded: 0, max: 0, judged: 0, total: 0 };
    const awarded = detail.answers.reduce((s, a) => s + (Number(a.points_awarded) || 0), 0);
    const max = detail.answers.reduce((s, a) => s + (Number(a.max_points) || 0), 0);
    const judged = detail.answers.filter((a) => a.judge_status !== 'pending').length;
    return { awarded, max, judged, total: detail.answers.length };
  }, [detail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-500" size={28} />
          <p className="mt-3 font-bold text-slate-600">Loading submission…</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !detail) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
            <AlertCircle className="mb-2" size={22} />
            <p className="font-black">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.push('/admin/manual-quiz')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-rose-800 shadow-sm hover:bg-rose-100"
            >
              <ArrowLeft size={14} /> Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const progressPct = rollup.total ? Math.round((rollup.judged / rollup.total) * 100) : 0;
  const scorePct = rollup.max ? Math.round((rollup.awarded / rollup.max) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/manual-quiz')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back to list
            </button>
            <h1 className="text-2xl font-black text-slate-900">🎯 Manual Quiz Review</h1>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
              {detail.id.slice(0, 10)}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Child</div>
              <div className="text-xl font-black text-slate-900">{detail.user_name || 'No name'}</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {detail.email ? (
                  <li className="flex items-center gap-2">
                    <Mail size={14} className="text-indigo-500" />
                    <a href={`mailto:${detail.email}`} className="font-semibold hover:underline">
                      {detail.email}
                    </a>
                  </li>
                ) : null}
                {detail.contact_number ? (
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-emerald-500" />
                    <a
                      href={`https://wa.me/${String(detail.contact_number).replace(/\D+/g, '')}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {detail.contact_number}
                    </a>
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-rose-400" />
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      Missing phone
                    </span>
                  </li>
                )}
                {detail.city ? (
                  <li className="flex items-center gap-2">
                    <MapPin size={14} className="text-sky-500" /> {detail.city}
                  </li>
                ) : null}
                {detail.age ? (
                  <li className="flex items-center gap-2">
                    <Hash size={14} className="text-violet-500" /> Age: {detail.age}
                  </li>
                ) : null}
                <li className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" />{' '}
                  {new Date(detail.submitted_at).toLocaleString()}
                </li>
                <li className="flex items-center gap-2">
                  <Award size={14} className="text-amber-500" />{' '}
                  <span className="font-semibold">
                    {detail.quiz_key === 'aug-2026-mixed' ? 'Aug 2026 Mixed' : detail.quiz_key}
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Judging Progress</div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-3xl font-black text-slate-900">
                    {rollup.judged}<span className="text-xl text-slate-400">/{rollup.total}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500">Questions judged</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-amber-600">
                    {rollup.awarded}<span className="text-xl text-slate-400">/{rollup.max}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500">Points (roll-up)</div>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[11px] font-bold text-slate-500">{progressPct}% judged · {scorePct}% score</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Status &amp; Finalize</div>
              <div className="mb-3">
                <div className="text-sm font-bold text-slate-700">Current:</div>
                <div className="mt-1">
                  {detail.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800">
                      <CheckCircle2 size={14} /> Approved +{detail.points_awarded} pts
                    </span>
                  ) : detail.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-black text-rose-800">
                      <XCircle size={14} /> Rejected
                    </span>
                  ) : detail.status === 'reviewing' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-800">
                      <Eye size={14} /> Reviewing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                      <AlertCircle size={14} /> Pending
                    </span>
                  )}
                </div>
              </div>

              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                Admin notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes — saved when you Approve / Reject / Mark Reviewing"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
              />

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  disabled={finalizing !== null}
                  onClick={() => finalize('reviewing')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {finalizing === 'reviewing' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  {finalizing === 'reviewing' ? 'Saving…' : 'Mark Reviewing'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={finalizing !== null}
                    onClick={() => finalize('rejected')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {finalizing === 'rejected' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ThumbsDown size={14} />
                    )}
                    {finalizing === 'rejected' ? '…' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    disabled={finalizing !== null}
                    onClick={() => finalize('approved')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {finalizing === 'approved' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ThumbsUp size={14} />
                    )}
                    {finalizing === 'approved' ? '…' : `Approve (+${rollup.awarded} pts)`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {detail.answers.map((a, i) => (
              <div
                key={a.id}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  a.judge_status === 'correct'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : a.judge_status === 'partial'
                      ? 'border-amber-200 bg-amber-50/30'
                      : a.judge_status === 'incorrect'
                        ? 'border-rose-200 bg-rose-50/30'
                        : a.judge_status === 'skipped'
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                    Q{i + 1}
                  </span>
                  {a.question_topic ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {a.question_topic}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                    🏆 Max {a.max_points} pts
                  </span>
                  {a.judge_status !== 'pending' ? (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                      <Save size={12} /> Saved {a.judged_at ? new Date(a.judged_at).toLocaleTimeString() : ''}
                    </span>
                  ) : null}
                </div>
                <p className="text-base font-black leading-7 text-slate-900">{a.question_prompt}</p>
                {a.reference_answer ? (
                  <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <div className="mb-0.5 text-[11px] font-black uppercase tracking-wide text-indigo-700">
                      Reference answer
                    </div>
                    <p className="text-sm font-semibold leading-6 text-indigo-900 whitespace-pre-wrap">
                      {a.reference_answer}
                    </p>
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-0.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <MessageSquare size={12} className="mr-1 inline align-text-bottom" />
                    Child’s answer
                  </div>
                  <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                    {a.answer_text || <span className="italic text-slate-400">(blank — no answer)</span>}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex flex-wrap gap-1.5">
                    {JUDGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={acting === a.id}
                        onClick={() => judgeAnswer(a.id, opt.key)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black shadow-sm transition disabled:opacity-50 ${statusClass(opt.key)}`}
                        title={opt.label}
                      >
                        {acting === a.id ? <Loader2 size={12} className="animate-spin" /> : opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase tracking-wide text-slate-500">Points</label>
                    <input
                      type="number"
                      min={0}
                      max={a.max_points}
                      value={a.points_awarded}
                      onChange={(e) => updatePoints(a.id, Number(e.target.value))}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-black text-slate-900 shadow-sm outline-none focus:border-indigo-400"
                    />
                    <span className="text-sm font-bold text-slate-400">/ {a.max_points}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Judge notes (private — saved to DB)
                  </label>
                  <textarea
                    rows={2}
                    value={a.judge_notes ?? ''}
                    placeholder="E.g. 'Good answer — correctly named Battle of Khandaq but missed Salman al-Farsi RA'"
                    onBlur={(e) => {
                      if (e.target.value !== (a.judge_notes ?? '')) updateNotes(a.id, e.target.value);
                    }}
                    onChange={(e) => {
                      // Optimistically update local UI; save on blur
                      setDetail((prev) =>
                        prev
                          ? {
                              ...prev,
                              answers: prev.answers.map((aa) =>
                                aa.id === a.id ? { ...aa, judge_notes: e.target.value } : aa
                              ),
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
