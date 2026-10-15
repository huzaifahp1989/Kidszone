'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SUBMISSION_STATUS_LABELS, type WrittenSubmissionStatus } from '@/lib/written-competition';

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

type AnswerDraft = {
  id: string;
  questionNumber: number;
  questionText: string;
  answerText: string;
  maxMarks: number;
  marksAwarded: number | null;
  adminFeedback: string;
  expectedAnswer: string;
  markingGuidance: string;
  source: string;
};

type Detail = {
  submission: {
    id: string;
    userId: string;
    userName: string;
    email: string;
    city: string;
    age: number | null;
    contactNumber: string;
    status: WrittenSubmissionStatus;
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    adminNotes: string;
    submittedAt: string;
  };
  answers: AnswerDraft[];
  profile: Record<string, unknown> | null;
};

export default function AdminWrittenSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = String(params?.id || '');
  const submissionId = String(params?.submissionId || '');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drafts, setDrafts] = useState<AnswerDraft[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${competitionId}/submissions/${submissionId}`, {
      headers: adminHeaders,
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load submission');
    setDetail(json);
    setDrafts(json.answers || []);
    setAdminNotes(json.submission?.adminNotes || '');
  }, [competitionId, submissionId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [load, router]);

  const allMarked = drafts.length > 0 && drafts.every((answer) => answer.marksAwarded != null && answer.marksAwarded >= 0);
  const liveTotal = useMemo(
    () => drafts.reduce((sum, answer) => sum + (answer.marksAwarded == null ? 0 : Number(answer.marksAwarded)), 0),
    [drafts]
  );
  const liveMax = useMemo(() => drafts.reduce((sum, answer) => sum + Number(answer.maxMarks || 0), 0), [drafts]);

  const saveMark = async (answer: AnswerDraft) => {
    setSavingId(answer.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/written-competitions/${competitionId}/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'mark',
          answerId: answer.id,
          marksAwarded: Number(answer.marksAwarded || 0),
          adminFeedback: answer.adminFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save mark');
      setDetail(json);
      setDrafts(json.answers || []);
      setMessage('Marks saved. Total updates automatically.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save mark');
    } finally {
      setSavingId(null);
    }
  };

  const finalize = async (action: 'approve' | 'reject' | 'save_later') => {
    setError('');
    const res = await fetch(`/api/admin/written-competitions/${competitionId}/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ action, adminNotes }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not update submission');
      return;
    }
    setDetail(json);
    setDrafts(json.answers || []);
    setMessage(
      action === 'approve'
        ? json.submission?.status === 'eligible'
          ? 'Entry approved and marked Eligible for the prize draw.'
          : 'Entry approved. Score is below the minimum, so it is not eligible yet.'
        : action === 'reject'
          ? 'Entry rejected.'
          : 'Saved for later review.'
    );
  };

  if (!detail) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="text-slate-600">{error || 'Loading submission...'}</p>
      </main>
    );
  }

  const profile = detail.profile || {};

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push(`/admin/written-competitions/${competitionId}`)} className="rounded-full border bg-white p-2 shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Pending Admin Review</p>
            <h1 className="text-3xl font-black text-slate-900">{detail.submission.userName || 'Participant'}</h1>
          </div>
        </div>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">{error}</div>}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-black">Participant Information</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="font-bold">Name:</span> {detail.submission.userName}</p>
            <p><span className="font-bold">User ID:</span> {detail.submission.userId}</p>
            <p><span className="font-bold">Kids Zone profile:</span> {String(profile.name || profile.username || detail.submission.userName || '—')}</p>
            <p><span className="font-bold">Email/contact:</span> {detail.submission.email || String(profile.email || profile.family_email || '—')}</p>
            <p><span className="font-bold">City:</span> {detail.submission.city || String(profile.city || '—')}</p>
            <p><span className="font-bold">Age:</span> {detail.submission.age ?? String(profile.age || '—')}</p>
            <p><span className="font-bold">Phone:</span> {detail.submission.contactNumber || '—'}</p>
            <p><span className="font-bold">Submitted:</span> {new Date(detail.submission.submittedAt).toLocaleString()}</p>
            <p><span className="font-bold">Status:</span> {SUBMISSION_STATUS_LABELS[detail.submission.status]}</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-emerald-50 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Total score</p>
          <p className="mt-1 text-4xl font-black text-slate-900">
            {detail.submission.totalMarks} / {detail.submission.maxMarks}
          </p>
          <p className="text-lg font-bold text-emerald-900">Percentage: {detail.submission.percentage}%</p>
          <p className="mt-1 text-xs text-slate-600">Live draft while marking: {liveTotal} / {liveMax}. Participants cannot edit this score.</p>
        </section>

        {drafts.map((answer) => (
          <article key={answer.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-emerald-700">Question {answer.questionNumber}</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">{answer.questionText}</h3>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Participant&apos;s Answer</p>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">{answer.answerText || '—'}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm">
                <p className="font-bold text-amber-900">Expected Answer / Marking Guidance</p>
                <p className="mt-2 whitespace-pre-wrap text-amber-950">{answer.expectedAnswer || '—'}</p>
                <p className="mt-3 whitespace-pre-wrap text-amber-900">{answer.markingGuidance || '—'}</p>
              </div>
              <div className="rounded-2xl border p-4 text-sm">
                <p className="font-bold">Source</p>
                <p className="mt-1">{answer.source || 'Admin has not entered a source yet.'}</p>
                <p className="mt-3 font-bold">Marks Available: {answer.maxMarks}</p>
                <label className="mt-3 block font-bold">
                  Marks Awarded: [ / {answer.maxMarks} ]
                  <input
                    type="number"
                    min={0}
                    max={answer.maxMarks}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                    value={answer.marksAwarded ?? ''}
                    onChange={(event) =>
                      setDrafts((prev) =>
                        prev.map((item) =>
                          item.id === answer.id
                            ? { ...item, marksAwarded: event.target.value === '' ? null : Number(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </label>
                <label className="mt-3 block font-bold">
                  Admin Feedback
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                    value={answer.adminFeedback}
                    onChange={(event) =>
                      setDrafts((prev) => prev.map((item) => (item.id === answer.id ? { ...item, adminFeedback: event.target.value } : item)))
                    }
                    placeholder="Good answer. You mentioned the main events but missed..."
                  />
                </label>
                <button
                  type="button"
                  disabled={savingId === answer.id || answer.marksAwarded == null}
                  onClick={() => void saveMark(answer)}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingId === answer.id ? 'Saving...' : 'Save marks'}
                </button>
              </div>
            </div>
          </article>
        ))}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Review Complete</h2>
          <p className="mt-2 text-lg font-bold">
            Total: {detail.submission.totalMarks} / {detail.submission.maxMarks}
          </p>
          <textarea
            rows={3}
            className="mt-4 w-full rounded-xl border px-3 py-2"
            placeholder="Overall admin notes"
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void finalize('approve')} disabled={!allMarked} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              Approve Entry
            </button>
            <button type="button" onClick={() => void finalize('reject')} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white">
              Reject Entry
            </button>
            <button type="button" onClick={() => void finalize('save_later')} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white">
              Save and Review Later
            </button>
          </div>
          {!allMarked && <p className="mt-3 text-sm text-amber-800">Mark every question before approving. Approved entries that meet the minimum score become Eligible.</p>}
        </section>
      </div>
    </main>
  );
}
