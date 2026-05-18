'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MASJID_AL_AQSA_BONUS_QUESTION, MASJID_AL_AQSA_MAIN_QUESTION_COUNT, MASJID_AL_AQSA_QUESTIONS, MASJID_AL_AQSA_MAX_TOTAL_SCORE, type MasjidAlAqsaSubmission } from '@/lib/masjid-al-aqsa-competition';
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';

type ReviewDraft = {
  questionMarks: number[];
  mainScoreOverride: number;
  manualAdjustment: number;
  bonusMarks: number;
  adminNotes: string;
};

const ADJUSTMENT_TOKEN_REGEX = /\[\[manual_adjustment=(-?\d+)\]\]/;

function clampManualAdjustment(value: number) {
  return Math.max(-15, Math.min(15, Math.trunc(value)));
}

function parseAdjustmentFromNotes(notes: string | null | undefined) {
  if (!notes) return { adjustment: 0, cleanNotes: '' };
  const match = notes.match(ADJUSTMENT_TOKEN_REGEX);
  const adjustment = match ? clampManualAdjustment(Number(match[1] || 0)) : 0;
  const cleanNotes = String(notes).replace(ADJUSTMENT_TOKEN_REGEX, '').trim();
  return { adjustment, cleanNotes };
}

export default function AdminMasjidAlAqsaCompetitionPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<MasjidAlAqsaSubmission[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, reviewed: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>({ questionMarks: Array(MASJID_AL_AQSA_MAIN_QUESTION_COUNT).fill(0), mainScoreOverride: 0, manualAdjustment: 0, bonusMarks: 0, adminNotes: '' });

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
    }
  }, [router]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/competitions/masjid-al-aqsa/submissions', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load submissions');
      setSubmissions(Array.isArray(json.submissions) ? json.submissions : []);
      setStats(json.stats || { total: 0, submitted: 0, reviewed: 0, approved: 0, rejected: 0 });
      if (!selectedId && json.submissions?.length) {
        setSelectedId(json.submissions[0].id);
        const initialMarks = Array.isArray(json.submissions[0].question_marks)
          ? json.submissions[0].question_marks.slice(0, MASJID_AL_AQSA_MAIN_QUESTION_COUNT)
          : Array(MASJID_AL_AQSA_MAIN_QUESTION_COUNT).fill(0);
        const parsed = parseAdjustmentFromNotes(String(json.submissions[0].admin_notes || ''));
        setDraft({
          questionMarks: initialMarks,
          mainScoreOverride: Math.max(0, Math.min(10, Number(json.submissions[0].main_score ?? initialMarks.reduce((sum: number, mark: number) => sum + Number(mark || 0), 0)))),
          manualAdjustment: parsed.adjustment,
          bonusMarks: Number(json.submissions[0].bonus_marks || 0),
          adminNotes: parsed.cleanNotes,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const selected = useMemo(() => submissions.find((submission) => submission.id === selectedId) || null, [submissions, selectedId]);

  useEffect(() => {
    if (!selected) return;
    const selectedMarks = Array.isArray(selected.question_marks)
      ? selected.question_marks.slice(0, MASJID_AL_AQSA_MAIN_QUESTION_COUNT).map((mark) => (Number(mark) > 0 ? 1 : 0))
      : Array(MASJID_AL_AQSA_MAIN_QUESTION_COUNT).fill(0);
    const parsed = parseAdjustmentFromNotes(String(selected.admin_notes || ''));
    setDraft({
      questionMarks: selectedMarks,
      mainScoreOverride: Math.max(0, Math.min(10, Number(selected.main_score ?? selectedMarks.reduce((sum, mark) => sum + Number(mark || 0), 0)))),
      manualAdjustment: parsed.adjustment,
      bonusMarks: Number(selected.bonus_marks || 0),
      adminNotes: parsed.cleanNotes,
    });
  }, [selected]);

  const markCount = draft.questionMarks.reduce((sum, mark) => sum + Number(mark || 0), 0);
  const effectiveMainScore = Math.max(0, Math.min(10, Number.isFinite(Number(draft.mainScoreOverride)) ? Number(draft.mainScoreOverride) : markCount));
  const totalScore = Math.min(MASJID_AL_AQSA_MAX_TOTAL_SCORE, effectiveMainScore + Math.max(0, Math.min(5, Number(draft.bonusMarks || 0))));
  const effectiveAdjustment = clampManualAdjustment(Number(draft.manualAdjustment || 0));
  const awardablePoints = Math.max(0, totalScore + effectiveAdjustment);

  const saveReview = async (action: 'review' | 'approve' | 'reject') => {
    if (!selected) return;
    const res = await fetch(`/api/admin/competitions/masjid-al-aqsa/submissions/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
      body: JSON.stringify({
        action,
        questionMarks: draft.questionMarks,
        mainScoreOverride: effectiveMainScore,
        manualAdjustment: effectiveAdjustment,
        bonusMarks: draft.bonusMarks,
        adminNotes: draft.adminNotes,
        questionOrder: selected.question_order,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || 'Failed to save review');
      return;
    }
    setSelectedId(json.submission.id);
    await fetchSubmissions();
    if (action === 'approve') {
      const awarded = Number(json?.pointsAwarded || 0);
      alert(awarded > 0 ? `Submission approved. ${awarded} points awarded.` : 'Submission approved.');
      return;
    }
    alert(action === 'reject' ? 'Submission rejected' : 'Review saved');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Islam Media Central</p>
              <h1 className="text-3xl font-black text-slate-900">Masjid Al-Aqsa Competition Review</h1>
              <p className="text-sm text-slate-600">Manual marking, bonus marks, and winner approval</p>
            </div>
          </div>
          <button onClick={fetchSubmissions} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Total', stats.total, 'bg-white'],
            ['Submitted', stats.submitted, 'bg-amber-50'],
            ['Reviewed', stats.reviewed, 'bg-sky-50'],
            ['Approved', stats.approved, 'bg-emerald-50'],
            ['Rejected', stats.rejected, 'bg-rose-50'],
          ].map(([label, value, className]) => (
            <div key={String(label)} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${className}`}>
              <div className="text-2xl font-black text-slate-900">{String(value)}</div>
              <div className="text-sm text-slate-600">{String(label)}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black text-slate-900">Submissions</h2>
            <div className="mt-4 space-y-3">
              {loading && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">Loading submissions...</div>}
              {!loading && submissions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">No submissions yet</div>}
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => setSelectedId(submission.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === submission.id ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{submission.full_name}</p>
                      <p className="text-xs text-slate-500">{submission.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{submission.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Main: {submission.main_score ?? 0}/10</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Bonus: {submission.bonus_marks ?? 0}/5</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Total: {submission.total_score ?? 0}/15</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Select a submission to review</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selected.full_name}</h2>
                    <p className="text-sm text-slate-600">{selected.email}</p>
                    <p className="text-xs text-slate-500">Submitted at {new Date(selected.created_at).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Current total</p>
                    <p className="text-3xl font-black text-slate-900">{totalScore}/15</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selected.question_order
                    .filter((questionId) => questionId !== MASJID_AL_AQSA_BONUS_QUESTION?.id)
                    .map((questionId: string, index: number) => {
                      const question = MASJID_AL_AQSA_QUESTIONS.find((item) => item.id === questionId);
                      const answer = String(selected.answers?.[questionId] || '');
                      const mark = draft.questionMarks[index] || 0;
                      return (
                        <div key={questionId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-3xl">
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Question {index + 1}</p>
                              <p className="mt-1 font-bold text-slate-900">{question?.prompt || questionId}</p>
                              <p className="mt-1 text-xs text-slate-500">Suggested answer: {question?.answerHint || 'Manual review'}</p>
                              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{answer || 'No answer submitted'}</p>
                            </div>
                            <button
                              onClick={() => {
                                setDraft((prev) => ({
                                  ...prev,
                                  questionMarks: prev.questionMarks.map((value, currentIndex) => (currentIndex === index ? (value ? 0 : 1) : value)),
                                }));
                              }}
                              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${mark ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
                            >
                              {mark ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {mark ? 'Correct' : 'Incorrect'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {MASJID_AL_AQSA_BONUS_QUESTION ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Bonus question</p>
                    <p className="mt-1 font-bold text-slate-900">{MASJID_AL_AQSA_BONUS_QUESTION.prompt}</p>
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{String(selected.bonus_answer || 'No bonus answer submitted')}</p>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block text-sm font-bold text-amber-900">Main score out of 10</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={draft.mainScoreOverride}
                    onChange={(event) => setDraft((prev) => ({ ...prev, mainScoreOverride: Number(event.target.value || 0) }))}
                    className="mt-2 w-24 rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-slate-900"
                  />
                  <p className="mt-2 text-xs text-amber-900/80">Question toggles suggest correctness, but you can directly adjust main points here.</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block text-sm font-bold text-amber-900">Manual points adjustment (+/-)</label>
                  <input
                    type="number"
                    min={-15}
                    max={15}
                    value={draft.manualAdjustment}
                    onChange={(event) => setDraft((prev) => ({ ...prev, manualAdjustment: Number(event.target.value || 0) }))}
                    className="mt-2 w-24 rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-slate-900"
                  />
                  <p className="mt-2 text-xs text-amber-900/80">Use this for admin-only bonus or penalty. Effective points on approve: {awardablePoints}</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block text-sm font-bold text-amber-900">Bonus marks out of 5</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={draft.bonusMarks}
                    onChange={(event) => setDraft((prev) => ({ ...prev, bonusMarks: Number(event.target.value || 0) }))}
                    className="mt-2 w-24 rounded-xl border border-amber-200 bg-white px-3 py-2 font-bold text-slate-900"
                  />
                  <p className="mt-2 text-xs text-amber-900/80">Bonus answers are manually judged for Islamic understanding and clarity.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Admin notes</label>
                  <textarea
                    rows={4}
                    value={draft.adminNotes}
                    onChange={(event) => setDraft((prev) => ({ ...prev, adminNotes: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-teal-400"
                    placeholder="Leave review notes or winner comments"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => void saveReview('review')} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    Save review
                  </button>
                  <button onClick={() => void saveReview('approve')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500">
                    <ShieldCheck size={16} /> Approve winner
                  </button>
                  <button onClick={() => void saveReview('reject')} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-500">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
