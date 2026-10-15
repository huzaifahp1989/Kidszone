'use client';

import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  OCTOBER_HADITH_QUESTIONS,
  type OctoberHadithQuestionId,
} from '@/lib/october-hadith-quiz';

type Submission = {
  id: string;
  full_name: string;
  age: number;
  madrasah: string;
  city: string;
  answers: Record<OctoberHadithQuestionId, string>;
  question_marks: number[] | null;
  marks_total: number | null;
  result: 'pending_review' | 'pass' | 'failed';
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type ReviewQuestion = (typeof OCTOBER_HADITH_QUESTIONS)[number] & { markingGuide: string };

const adminHeaders = { 'Content-Type': 'application/json' };

const resultLabels: Record<Submission['result'], string> = {
  pending_review: 'Pending review',
  pass: 'Pass',
  failed: 'Failed',
};

export default function AdminOctoberHadithQuizPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [questions, setQuestions] = React.useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [marksDraft, setMarksDraft] = React.useState<Record<string, string[]>>({});
  const [resultDraft, setResultDraft] = React.useState<Record<string, 'pass' | 'failed'>>({});
  const [notesDraft, setNotesDraft] = React.useState<Record<string, string>>({});

  const loadSubmissions = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/hadith-october-quiz/submissions', {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not load submissions.');
      const loaded = Array.isArray(data.submissions) ? data.submissions as Submission[] : [];
      setQuestions(Array.isArray(data.questions) ? data.questions as ReviewQuestion[] : []);
      setSubmissions(loaded);
      setMarksDraft(Object.fromEntries(loaded.map((submission) => [
        submission.id,
        submission.question_marks?.map(String) || Array(OCTOBER_HADITH_QUESTIONS.length).fill(''),
      ])));
      setResultDraft(Object.fromEntries(loaded.map((submission) => [
        submission.id,
        submission.result === 'failed' ? 'failed' : 'pass',
      ])));
      setNotesDraft(Object.fromEntries(loaded.map((submission) => [submission.id, submission.admin_notes || ''])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    void loadSubmissions();
  }, [loadSubmissions, router]);

  const saveReview = async (submissionId: string) => {
    setError('');
    setMessage('');
    const marks = marksDraft[submissionId] || [];
    if (marks.length !== OCTOBER_HADITH_QUESTIONS.length || marks.some((mark) => mark === '' || !Number.isInteger(Number(mark)) || Number(mark) < 0 || Number(mark) > 10)) {
      setError('Enter a whole-number mark from 0 to 10 for each of the 10 answers.');
      return;
    }

    setSavingId(submissionId);
    try {
      const response = await fetch(`/api/admin/hadith-october-quiz/submissions/${encodeURIComponent(submissionId)}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          questionMarks: marks.map(Number),
          result: resultDraft[submissionId],
          adminNotes: notesDraft[submissionId] || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save review.');
      setMessage(`Review saved for ${data.submission.full_name} (${data.submission.marks_total}/100, ${resultLabels[data.submission.result as Submission['result']]}).`);
      await loadSubmissions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save review.');
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = submissions.filter((submission) => submission.result === 'pending_review').length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">October Hadith Quiz · Reviews</h1>
            <p className="mt-1 text-sm text-slate-600">{pendingCount} awaiting review · Marks out of 100</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void loadSubmissions()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Refresh
            </button>
            <Link href="/admin" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">← Admin</Link>
          </div>
        </div>

        {message ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{message}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}
        {loading ? <p className="rounded-xl bg-white p-6 text-slate-600">Loading submissions…</p> : null}
        {!loading && !error && submissions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No quiz submissions yet.</p>
        ) : null}

        {!loading && submissions.map((submission) => {
          const marks = marksDraft[submission.id] || [];
          const liveTotal = marks.reduce((total, mark) => total + (mark === '' ? 0 : Number(mark)), 0);
          return (
            <article key={submission.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">{submission.full_name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Age {submission.age} · {submission.madrasah} · {submission.city}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                  submission.result === 'pass' ? 'bg-emerald-100 text-emerald-800' :
                    submission.result === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {resultLabels[submission.result]}{submission.marks_total !== null ? ` · ${submission.marks_total}/100` : ''}
                </span>
              </header>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveReview(submission.id);
                }}
                className="space-y-5 p-5"
              >
                {questions.map((question, index) => (
                  <section key={question.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">Q{index + 1} · {question.difficulty}</h3>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        Mark
                        <input
                          required
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={marks[index] ?? ''}
                          onChange={(event) => setMarksDraft((current) => ({
                            ...current,
                            [submission.id]: (current[submission.id] || Array(OCTOBER_HADITH_QUESTIONS.length).fill(''))
                              .map((mark, markIndex) => markIndex === index ? event.target.value : mark),
                          }))}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5"
                        />
                        <span className="text-slate-500">/ 10</span>
                      </label>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{question.question}</p>
                    <p className="mt-1 text-xs text-slate-500">{question.source}</p>
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-bold">Expected answer: </span>{question.markingGuide}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-teal-50/70 p-3 text-sm text-teal-950">
                      {submission.answers?.[question.id] || 'No answer provided'}
                    </p>
                  </section>
                ))}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700">
                    Result
                    <select
                      value={resultDraft[submission.id] || 'pass'}
                      onChange={(event) => setResultDraft((current) => ({
                        ...current,
                        [submission.id]: event.target.value as 'pass' | 'failed',
                      }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="pass">Pass</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                  <div className="rounded-lg bg-slate-100 p-3 text-sm font-extrabold text-slate-800">
                    Current marks: {liveTotal} / 100
                  </div>
                </div>
                <label className="block text-sm font-bold text-slate-700">
                  Admin notes (optional)
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={notesDraft[submission.id] || ''}
                    onChange={(event) => setNotesDraft((current) => ({ ...current, [submission.id]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  />
                </label>
                <button type="submit" disabled={savingId === submission.id} className="rounded-xl bg-teal-700 px-5 py-3 font-extrabold text-white hover:bg-teal-800 disabled:opacity-50">
                  {savingId === submission.id ? 'Saving review…' : 'Save marks and result'}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </main>
  );
}
