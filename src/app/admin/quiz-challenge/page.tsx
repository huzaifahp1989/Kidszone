'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CHALLENGE_QUIZ_KEYS, CHALLENGE_QUIZZES, type ChallengeQuizKey } from '@/data/challenge-quizzes';

interface AdminQuestion {
  id: string;
  quiz_key: string;
  prompt: string;
  answer: string;
  accepted_answers: string[];
  explanation: string;
  is_bonus: boolean;
  points: number;
  sort_order: number;
  active: boolean;
}

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

const emptyForm = {
  id: '',
  prompt: '',
  answer: '',
  accepted_answers: '',
  explanation: '',
  is_bonus: false,
  points: 1,
  sort_order: 0,
  active: true,
};

export default function AdminQuizChallengePage() {
  const router = useRouter();
  const [quiz, setQuiz] = React.useState<ChallengeQuizKey>('quran-stories');
  const [questions, setQuestions] = React.useState<AdminQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [tableMissing, setTableMissing] = React.useState(false);
  const [setupSql, setSetupSql] = React.useState('');
  const [form, setForm] = React.useState({ ...emptyForm });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/quiz-challenge/questions?quiz=${quiz}`, { headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setQuestions(data.questions || []);
      setTableMissing(Boolean(data.tableMissing));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [quiz]);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    load();
  }, [router, load]);

  const runSetup = async () => {
    setMessage('');
    setError('');
    setSetupSql('');
    try {
      const res = await fetch('/api/admin/quiz-challenge/setup', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Setup failed');
        if (data.sql) setSetupSql(data.sql);
        return;
      }
      setMessage(data.message + (data.seeded ? ` Seeded ${data.seeded} default questions.` : ''));
      setTableMissing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    }
  };

  const resetForm = () => setForm({ ...emptyForm, sort_order: questions.length });

  const startEdit = (q: AdminQuestion) => {
    setForm({
      id: q.id,
      prompt: q.prompt,
      answer: q.answer,
      accepted_answers: (q.accepted_answers || []).join(', '),
      explanation: q.explanation || '',
      is_bonus: q.is_bonus,
      points: q.points,
      sort_order: q.sort_order,
      active: q.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    setMessage('');
    setError('');
    if (!form.prompt.trim() || !form.answer.trim()) {
      setError('Question and correct answer are required.');
      return;
    }
    const payload = {
      ...(form.id ? { id: form.id } : {}),
      quiz_key: quiz,
      prompt: form.prompt,
      answer: form.answer,
      accepted_answers: form.accepted_answers,
      explanation: form.explanation,
      is_bonus: form.is_bonus,
      points: Number(form.points) || (form.is_bonus ? 2 : 1),
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    };
    try {
      const res = await fetch('/api/admin/quiz-challenge/questions', {
        method: form.id ? 'PUT' : 'POST',
        headers: adminHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(form.id ? 'Question updated.' : 'Question added.');
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (q: AdminQuestion) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/quiz-challenge/questions?id=${encodeURIComponent(q.id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setMessage('Question deleted.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">Quiz Challenge — Questions</h1>
          <Link href="/admin" className="text-sm font-bold text-violet-700 hover:underline">
            ← Admin
          </Link>
        </div>

        {tableMissing ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-800">The Quiz Challenge tables are not set up yet.</p>
            <button
              type="button"
              onClick={runSetup}
              className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              Create tables &amp; seed default questions
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={runSetup}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Re-run setup / seed defaults
          </button>
        )}

        {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {setupSql ? (
          <details className="rounded-lg border border-slate-300 bg-white p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Show SQL to run manually</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{setupSql}</pre>
          </details>
        ) : null}

        <div className="flex gap-2">
          {CHALLENGE_QUIZ_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setQuiz(key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                quiz === key ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 hover:bg-violet-50'
              }`}
            >
              {CHALLENGE_QUIZZES[key].emoji} {CHALLENGE_QUIZZES[key].title}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">{form.id ? 'Edit question' : 'Add a question'}</h2>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Question
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Correct answer
                <input
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Accepted variations (comma separated)
                <input
                  value={form.accepted_answers}
                  onChange={(e) => setForm((f) => ({ ...f, accepted_answers: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Explanation (shown after completion)
              <textarea
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.is_bonus} onChange={(e) => setForm((f) => ({ ...f, is_bonus: e.target.checked }))} />
                Bonus question
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                Points
                <input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                Order
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700">
                {form.id ? 'Update' : 'Add'} question
              </button>
              {form.id ? (
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="text-slate-500">No questions yet for this quiz.</p>
          ) : (
            questions.map((q, i) => (
              <div key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {i + 1}. {q.prompt} {q.is_bonus ? <span className="text-amber-600">⭐ bonus</span> : null}
                    {!q.active ? <span className="ml-1 text-xs text-rose-500">(hidden)</span> : null}
                  </p>
                  <p className="text-sm text-emerald-700">✔ {q.answer}</p>
                  {q.accepted_answers.length ? (
                    <p className="text-xs text-slate-500">also accepts: {q.accepted_answers.join(', ')}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(q)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(q)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-200">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
