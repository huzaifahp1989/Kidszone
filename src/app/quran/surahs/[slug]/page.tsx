'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { completeGameSession } from '@/lib/complete-game-session';
import {
  getDifficultyLabel,
  getSurahCourseBySlug,
  readSurahProgress,
  scoreSurahQuiz,
  writeSurahProgress,
} from '@/lib/surah-courses';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';

export default function SurahCourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = String(params?.slug || '');
  const course = getSurahCourseBySlug(slug);
  const { user } = useAuth();

  const [readConfirmed, setReadConfirmed] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreSurahQuiz> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    if (!course) return;
    setAnswers(Array.from({ length: course.quizQuestions.length }, () => -1));
  }, [course]);

  useEffect(() => {
    if (!user?.id || !course) return;
    const progress = readSurahProgress(user.id);
    const row = progress[course.slug];
    if (row?.completed) {
      setAlreadyCompleted(true);
      setReadConfirmed(true);
      setSubmitted(true);
      setResult({
        correct: row.score,
        total: course.quizQuestions.length,
        percent: row.percent,
        passed: true,
      });
    }
  }, [user?.id, course]);

  const allAnswered = useMemo(
    () => answers.length > 0 && answers.every((value) => value >= 0),
    [answers]
  );

  if (!course) {
    return (
      <div className="page-inner p-8">
        <p className="font-semibold">Surah course not found.</p>
        <Link href="/quran/surahs" className="text-violet-700 underline">
          Back to Surah activities
        </Link>
      </div>
    );
  }

  const submitQuiz = async () => {
    if (!allAnswered) {
      setMessage('Please answer every question before submitting.');
      return;
    }

    const scored = scoreSurahQuiz(course, answers);
    setResult(scored);
    setSubmitted(true);
    setMessage(null);

    if (!scored.passed) {
      setMessage(`You scored ${scored.percent}%. Read the lesson again and try once more — you need 80% to pass.`);
      return;
    }

    if (!user?.id) {
      setMessage('MashaAllah! You passed! Sign in to save progress and earn points.');
      return;
    }

    setSaving(true);
    try {
      const progress = readSurahProgress(user.id);
      const wasCompleted = Boolean(progress[course.slug]?.completed);

      progress[course.slug] = {
        completed: true,
        score: scored.correct,
        percent: scored.percent,
        completedAt: new Date().toISOString(),
      };
      writeSurahProgress(user.id, progress);
      setAlreadyCompleted(true);

      if (!wasCompleted) {
        const award = await completeGameSession({
          userId: user.id,
          gameId: `surah-course-${course.slug}`,
          gameTitle: `Surah ${course.englishName}`,
          difficulty: course.difficulty,
          tasksPlayed: course.quizQuestions.length,
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
    setAnswers(Array.from({ length: course.quizQuestions.length }, () => -1));
    setSubmitted(false);
    setResult(null);
    setMessage(null);
  };

  return (
    <div className="page-inner quran-learn-mobile pb-32">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link
          href="/quran/surahs"
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:underline"
        >
          <ArrowLeft size={16} /> All surah activities
        </Link>

        <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-200">
                Surah {course.number} · {course.revelation} · {getDifficultyLabel(course.difficulty)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-4xl">{course.emoji}</span>
                <div>
                  <h1 className="text-3xl font-black">{course.englishName}</h1>
                  <p className="font-arabic text-2xl text-violet-100">{course.arabicName}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-violet-100">{course.summary}</p>
            </div>
            {alreadyCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                <CheckCircle2 size={14} /> Completed
              </span>
            )}
          </div>
          <p className="mt-4 text-xs text-violet-200">
            {course.ayahCount} ayahs · Theme: {course.theme}
          </p>
          {course.juzAmmaLearnUrl && (
            <Link
              href={course.juzAmmaLearnUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25"
            >
              Read full Arabic & audio in Juz Amma <ChevronRight size={16} />
            </Link>
          )}
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
            <BookOpen className="text-violet-600" size={20} />
            <h2 className="text-xl font-black text-slate-900">Learn the surah</h2>
          </div>

          <div className="space-y-4">
            {course.sections.map((section, index) => (
              <article key={section.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  Lesson {index + 1}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-900">{section.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{section.content}</p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-violet-700">Key ayahs to remember</h3>
            <ul className="mt-3 space-y-3">
              {course.keyAyahs.map((ayah) => (
                <li key={ayah.reference} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <p className="text-xs font-bold text-violet-600">{ayah.reference}</p>
                  <p className="mt-2 font-arabic text-xl leading-loose text-slate-900">{ayah.text}</p>
                  <p className="mt-2 text-sm text-slate-700">{ayah.meaning}</p>
                </li>
              ))}
            </ul>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <input
              type="checkbox"
              checked={readConfirmed}
              onChange={(e) => setReadConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-emerald-400"
            />
            <span className="text-sm font-semibold text-emerald-900">
              I have read the lesson and I am ready for the quiz
            </span>
          </label>
        </section>

        {readConfirmed && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="text-amber-500" size={20} />
              <h2 className="text-xl font-black text-slate-900">Surah quiz</h2>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              Answer all {course.quizQuestions.length} questions. You need 80% to pass and complete this surah.
            </p>

            <div className="space-y-5">
              {course.quizQuestions.map((question, qIndex) => {
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
                        <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong> {question.explanation}
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
                    ? 'MashaAllah! You passed this surah activity.'
                    : 'Keep learning — read the lesson again and retry the quiz.'}
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
                <Button variant="secondary" onClick={() => router.push('/quran/surahs')}>
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
