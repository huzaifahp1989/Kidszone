'use client';

import Link from 'next/link';
import React from 'react';
import {
  isOctoberHadithQuizOpen,
  OCTOBER_HADITH_QUESTIONS,
  type OctoberHadithQuestionId,
} from '@/lib/october-hadith-quiz';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

export default function OctoberHadithQuizPage() {
  const { user, profile } = useAuth();
  const [started, setStarted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [age, setAge] = React.useState('');
  const [madrasah, setMadrasah] = React.useState('');
  const [city, setCity] = React.useState('');
  const [answers, setAnswers] = React.useState<Partial<Record<OctoberHadithQuestionId, string>>>({});
  const quizOpen = isOctoberHadithQuizOpen();
  const allAnswered = OCTOBER_HADITH_QUESTIONS.every(({ id }) => Boolean(answers[id]?.trim()));

  // Prefill the learner's details so a signed-in submission is quick to send.
  React.useEffect(() => {
    if (!profile) return;
    setFullName((current) => current || profile.name || '');
    setAge((current) => current || (profile.age ? String(profile.age) : ''));
    setMadrasah((current) => current || profile.madrasahName || '');
    setCity((current) => current || profile.city || '');
  }, [profile]);

  const startQuiz = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!fullName.trim() || !age || !madrasah.trim() || !city.trim()) {
      setError('Please complete every detail before starting.');
      return;
    }
    setStarted(true);
  };

  const submitQuiz = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/hadith-october-quiz/submissions', {
        method: 'POST',
        headers: await getAuthFetchHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          fullName,
          age: Number(age),
          madrasah,
          city,
          answers,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your answers could not be submitted.');
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your answers could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-inner">
      <main className="mx-auto max-w-3xl space-y-6">
        <Link href="/hadith" className="inline-flex rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50">
          ← Back to Hadith
        </Link>

        <header className="rounded-3xl bg-gradient-to-br from-teal-800 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-extrabold uppercase tracking-widest text-teal-100">What&apos;s new · October 2026</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Hadith Quiz</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-teal-50">
            Answer 10 questions in your own words. There are easy, medium, and difficult questions.
            An admin will read your answers, give each one a mark out of 10, and decide Pass or Failed.
          </p>
          <p className="mt-4 font-bold">Submit by 30 October 2026 · 100 marks total</p>
        </header>

        {!quizOpen ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <h2 className="text-xl font-extrabold">This quiz is closed</h2>
            <p className="mt-2">The October Hadith Quiz accepted entries until 30 October 2026.</p>
          </section>
        ) : submitted ? (
          <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950" role="status">
            <h2 className="text-xl font-extrabold">JazakAllahu khayran — your answers are submitted!</h2>
            <p className="mt-2">An admin will review your answers and record your marks and result.</p>
          </section>
        ) : !started ? (
          <form onSubmit={startQuiz} className="space-y-5 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Before you start</h2>
              <p className="mt-1 text-sm text-slate-600">Please enter your details so the admin can identify your submission.</p>
              {user ? (
                <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
                  Signed in — your result will be sent to your account, so if you do not pass you can try again.
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Full name
                <input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" autoComplete="name" />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Age
                <input required type="number" min={3} max={18} step={1} value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Madrasah
                <input required maxLength={120} value={madrasah} onChange={(event) => setMadrasah(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-bold text-slate-700">
                City
                <input required maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" autoComplete="address-level2" />
              </label>
            </div>
            {error ? <p className="text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
            <button type="submit" className="rounded-xl bg-teal-700 px-5 py-3 font-extrabold text-white hover:bg-teal-800">
              Start the quiz
            </button>
          </form>
        ) : (
          <form onSubmit={submitQuiz} className="space-y-5">
            <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
              <p className="font-extrabold text-slate-900">{fullName.trim()} · Age {age}</p>
              <p className="text-sm text-slate-600">{madrasah.trim()} · {city.trim()}</p>
            </div>
            {OCTOBER_HADITH_QUESTIONS.map((question, index) => (
              <section key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-extrabold text-slate-900">Question {index + 1}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    question.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                      question.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>{question.difficulty}</span>
                </div>
                <p className="mt-3 font-semibold leading-relaxed text-slate-800">{question.question}</p>
                <p className="mt-1 text-xs text-slate-500">Hadith reference: {question.source}</p>
                <label className="mt-4 block text-sm font-bold text-slate-700">
                  Your answer
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    value={answers[question.id] || ''}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
              </section>
            ))}
            {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
            <button type="submit" disabled={!allAnswered || submitting} className="w-full rounded-xl bg-teal-700 px-5 py-3 font-extrabold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit all 10 answers'}
            </button>
            <p className="text-center text-xs text-slate-500">Once submitted, your answers are sent to the admin for marking.</p>
          </form>
        )}
      </main>
    </div>
  );
}
