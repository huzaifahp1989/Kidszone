'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { useCompleteGameSession } from '@/lib/use-complete-game-session';
import {
  getSurahReadingBySlug,
  readSurahReadingProgress,
  scoreSurahReadingQuiz,
  writeSurahReadingProgress,
} from '@/lib/surah-readings';
import { DEFAULT_RECITER_ID } from '@/data/quran-reciters';
import { ArrowLeft, BookOpenText, CheckCircle2, Loader2, Lock, Trophy, Unlock } from 'lucide-react';

type Ayah = {
  numberInSurah: number;
  arabic: string;
  english: string;
};

export default function SurahReadingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = String(params?.slug || '');
  const reading = getSurahReadingBySlug(slug);
  const { user } = useAuth();
  const completeGameSession = useCompleteGameSession();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreSurahReadingQuiz> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!reading) return;
    setAnswers(Array.from({ length: reading.quizQuestions.length }, () => -1));
  }, [reading]);

  useEffect(() => {
    if (!user?.id || !reading) return;
    const progress = readSurahReadingProgress(user.id);
    const row = progress[reading.slug];
    if (row?.completed) {
      setAlreadyCompleted(true);
      setReachedEnd(true);
      setSubmitted(true);
      setResult({
        correct: row.score,
        total: reading.quizQuestions.length,
        percent: row.percent,
        passed: true,
      });
    }
  }, [user?.id, reading]);

  const loadSurah = useCallback(async () => {
    if (!reading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/quran/surah/${reading.number}?reciter=${DEFAULT_RECITER_ID}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load surah');
      setAyahs(Array.isArray(json.ayahs) ? json.ayahs : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load surah');
      setAyahs([]);
    } finally {
      setLoading(false);
    }
  }, [reading]);

  useEffect(() => {
    loadSurah();
  }, [loadSurah]);

  // Unlock the quiz once the learner has read all the way to the end of the surah.
  useEffect(() => {
    if (reachedEnd || ayahs.length === 0) return;
    const el = endRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReachedEnd(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setReachedEnd(true);
      },
      { rootMargin: '0px 0px -5% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ayahs.length, reachedEnd]);

  const allAnswered = useMemo(
    () => answers.length > 0 && answers.every((value) => value >= 0),
    [answers]
  );

  if (!reading) {
    return (
      <div className="page-inner p-8">
        <p className="font-semibold">Surah not found.</p>
        <Link href="/quran/learn-surah" className="text-violet-700 underline">
          Back to Learn Surah
        </Link>
      </div>
    );
  }

  const submitQuiz = async () => {
    if (!allAnswered) {
      setMessage('Please answer every question before submitting.');
      return;
    }

    const scored = scoreSurahReadingQuiz(reading, answers);
    setResult(scored);
    setSubmitted(true);
    setMessage(null);

    if (!scored.passed) {
      setMessage(
        `You scored ${scored.percent}%. Read the surah again and try once more — you need 80% to pass.`
      );
      return;
    }

    if (!user?.id) {
      setMessage('MashaAllah! You passed! Sign in to save progress and earn points.');
      return;
    }

    setSaving(true);
    try {
      const progress = readSurahReadingProgress(user.id);
      const wasCompleted = Boolean(progress[reading.slug]?.completed);

      progress[reading.slug] = {
        completed: true,
        score: scored.correct,
        percent: scored.percent,
        completedAt: new Date().toISOString(),
      };
      writeSurahReadingProgress(user.id, progress);
      setAlreadyCompleted(true);

      if (!wasCompleted) {
        const award = await completeGameSession({
          userId: user.id,
          gameId: `surah-reading-${reading.slug}`,
          gameTitle: `Surah ${reading.englishName}`,
          difficulty: reading.difficulty,
          tasksPlayed: reading.quizQuestions.length,
        });
        if (award.ok && award.pointsAwarded > 0) {
          setMessage(`MashaAllah! Surah completed! ${award.message || '+25 points!'}`);
        } else if (award.message) {
          setMessage(`MashaAllah! Surah completed! ${award.message}`);
        } else {
          setMessage('MashaAllah! Surah completed!');
        }
      } else {
        setMessage('MashaAllah! You passed again — this surah was already marked complete.');
      }
    } catch {
      setMessage('Quiz saved locally, but points could not be awarded right now.');
    } finally {
      setSaving(false);
    }
  };

  const retryQuiz = () => {
    setAnswers(Array.from({ length: reading.quizQuestions.length }, () => -1));
    setSubmitted(false);
    setResult(null);
    setMessage(null);
  };

  return (
    <div className="page-inner quran-learn-mobile pb-32">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link
          href="/quran/learn-surah"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700 hover:underline"
        >
          <ArrowLeft size={16} /> All surahs to read
        </Link>

        <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-200">
                Surah {reading.number} · {reading.revelation} · {reading.ayahCount} ayahs
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-4xl">{reading.emoji}</span>
                <div>
                  <h1 className="text-3xl font-black">{reading.englishName}</h1>
                  <p className="font-arabic text-2xl text-violet-100">{reading.arabicName}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-violet-100">{reading.summary}</p>
            </div>
            {alreadyCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                <CheckCircle2 size={14} /> Completed
              </span>
            )}
          </div>
          <p className="mt-4 text-xs text-violet-200">Theme: {reading.theme}</p>
        </section>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              result?.passed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="text-violet-600" size={20} />
            <h2 className="text-xl font-black text-slate-900">Read the surah</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="animate-spin" size={22} />
              Loading surah…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>Could not load the surah right now. {loadError}</p>
              <button
                type="button"
                onClick={loadSurah}
                className="mt-2 font-bold text-red-900 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Read every ayah from {reading.englishName} {reading.number}:1 to {reading.number}:
                {reading.ayahCount}. The quiz unlocks at the end.
              </p>

              <div className="space-y-4">
                {ayahs.map((ayah) => (
                  <article
                    key={ayah.numberInSurah}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-200 px-2 text-xs font-bold text-violet-800">
                      {reading.number}:{ayah.numberInSurah}
                    </span>
                    <p
                      className="font-arabic mt-3 text-2xl leading-loose text-slate-900"
                      dir="rtl"
                    >
                      {ayah.arabic}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{ayah.english}</p>
                  </article>
                ))}
              </div>

              <div ref={endRef} className="mt-6">
                {reachedEnd ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                    <Unlock size={18} /> You have finished reading {reading.englishName}. The quiz is
                    unlocked below!
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    <Lock size={18} /> Keep reading to the end of the surah to unlock the quiz.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {reachedEnd && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="text-amber-500" size={20} />
              <h2 className="text-xl font-black text-slate-900">Surah quiz</h2>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              Answer all {reading.quizQuestions.length} questions about {reading.englishName}. You
              need 80% to pass and earn points.
            </p>

            <div className="space-y-5">
              {reading.quizQuestions.map((question, qIndex) => {
                const selected = answers[qIndex];
                const showFeedback = submitted && result;
                const isCorrect = selected === question.correctAnswer;

                return (
                  <fieldset
                    key={question.id}
                    className={`rounded-2xl border p-4 ${
                      showFeedback
                        ? isCorrect
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-red-200 bg-red-50/40'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <legend className="px-1 text-sm font-bold text-slate-900">
                      {qIndex + 1}. {question.question}
                    </legend>
                    <div className="mt-3 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                            selected === optionIndex
                              ? 'border-violet-400 bg-violet-50 font-semibold'
                              : 'border-slate-200 bg-white hover:border-violet-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            checked={selected === optionIndex}
                            disabled={submitted && result?.passed}
                            onChange={() => {
                              setAnswers((prev) => {
                                const next = [...prev];
                                next[qIndex] = optionIndex;
                                return next;
                              });
                            }}
                            className="h-4 w-4"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {showFeedback && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-700">
                        <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>{' '}
                        {question.explanation}
                        {question.reference ? ` (${question.reference})` : ''}
                      </p>
                    )}
                  </fieldset>
                );
              })}
            </div>

            {submitted && result && (
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm">
                <p className="font-bold text-violet-900">
                  Score: {result.correct}/{result.total} ({result.percent}%)
                </p>
                <p className="mt-1 text-violet-800">
                  {result.passed
                    ? 'MashaAllah! You passed this surah quiz.'
                    : 'Keep learning — read the surah again and retry the quiz.'}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {!submitted || !result?.passed ? (
                <Button onClick={submitQuiz} disabled={!allAnswered || saving}>
                  {saving ? 'Saving…' : 'Submit quiz'}
                </Button>
              ) : null}
              {submitted && !result?.passed ? (
                <Button variant="secondary" onClick={retryQuiz}>
                  Try again
                </Button>
              ) : null}
              {submitted && result?.passed ? (
                <Button variant="secondary" onClick={() => router.push('/quran/learn-surah')}>
                  Choose another surah
                </Button>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
