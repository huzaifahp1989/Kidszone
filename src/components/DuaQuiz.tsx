'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { useCompleteGameSession } from '@/lib/use-complete-game-session';
import {
  readDuaProgress,
  scoreDuaQuiz,
  writeDuaProgress,
  type DuaQuizQuestion,
} from '@/data/dua-library';
import { CheckCircle2, Trophy } from 'lucide-react';

type DuaQuizProps = {
  /** Progress key + game id suffix, e.g. "99-names" or "quran-duas". */
  topicKey: string;
  /** Human title used for the points award, e.g. "Duas from the Quran". */
  topicTitle: string;
  questions: DuaQuizQuestion[];
  /** Where the "Back" button after passing should go. */
  backHref?: string;
  backLabel?: string;
};

/**
 * Shared quiz + points block for the Duas & Names section. Both the 99 Names page
 * and the dua category pages use it so the scoring and award logic stay identical.
 */
export function DuaQuiz({ topicKey, topicTitle, questions, backHref, backLabel }: DuaQuizProps) {
  const router = useRouter();
  const { user } = useAuth();
  const completeGameSession = useCompleteGameSession();

  const [answers, setAnswers] = useState<number[]>(() => Array.from({ length: questions.length }, () => -1));
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreDuaQuiz> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    setAnswers(Array.from({ length: questions.length }, () => -1));
  }, [questions]);

  useEffect(() => {
    if (!user?.id) return;
    const row = readDuaProgress(user.id)[topicKey];
    if (row?.completed) {
      setAlreadyCompleted(true);
      setSubmitted(true);
      setResult({ correct: row.score, total: questions.length, percent: row.percent, passed: true });
    }
  }, [user?.id, topicKey, questions.length]);

  const allAnswered = useMemo(
    () => answers.length > 0 && answers.every((value) => value >= 0),
    [answers]
  );

  const submitQuiz = async () => {
    if (!allAnswered) {
      setMessage('Please answer every question before submitting.');
      return;
    }

    const scored = scoreDuaQuiz(questions, answers);
    setResult(scored);
    setSubmitted(true);
    setMessage(null);

    if (!scored.passed) {
      setMessage(`You scored ${scored.percent}%. Learn the page again and try once more — you need 80% to pass.`);
      return;
    }

    if (!user?.id) {
      setMessage('MashaAllah! You passed! Sign in to save progress and earn points.');
      return;
    }

    setSaving(true);
    try {
      const progress = readDuaProgress(user.id);
      const wasCompleted = Boolean(progress[topicKey]?.completed);
      progress[topicKey] = {
        completed: true,
        score: scored.correct,
        percent: scored.percent,
        completedAt: new Date().toISOString(),
      };
      writeDuaProgress(user.id, progress);
      setAlreadyCompleted(true);

      if (!wasCompleted) {
        const award = await completeGameSession({
          userId: user.id,
          gameId: `dua-${topicKey}`,
          gameTitle: topicTitle,
          tasksPlayed: questions.length,
        });
        setMessage(
          award.pointsAwarded > 0
            ? `MashaAllah! ${award.message || '+25 points!'}`
            : award.message || 'MashaAllah! Topic completed!'
        );
      } else {
        setMessage('MashaAllah! You passed again — this topic was already marked complete.');
      }
    } catch {
      setMessage('Quiz saved locally, but points could not be awarded right now.');
    } finally {
      setSaving(false);
    }
  };

  const retryQuiz = () => {
    setAnswers(Array.from({ length: questions.length }, () => -1));
    setSubmitted(false);
    setResult(null);
    setMessage(null);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="text-amber-500" size={20} />
        <h2 className="text-xl font-black text-slate-900">Quick quiz</h2>
        {alreadyCompleted ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={14} /> Done
          </span>
        ) : null}
      </div>
      <p className="mb-5 text-sm text-slate-600">
        Answer all {questions.length} questions. You need 80% to pass and earn points.
      </p>

      <div className="space-y-5">
        {questions.map((question, qIndex) => {
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
                        ? 'border-teal-400 bg-teal-50 font-semibold'
                        : 'border-slate-200 bg-white hover:border-teal-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${topicKey}-q-${question.id}`}
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
              {showFeedback ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong> {question.explanation}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </div>

      {submitted && result ? (
        <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm">
          <p className="font-bold text-teal-900">
            Score: {result.correct}/{result.total} ({result.percent}%)
          </p>
          <p className="mt-1 text-teal-800">
            {result.passed
              ? 'MashaAllah! You passed this quiz.'
              : 'Keep learning — read the page again and retry the quiz.'}
          </p>
        </div>
      ) : null}

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            result?.passed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </div>
      ) : null}

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
        {submitted && result?.passed && backHref ? (
          <Button variant="secondary" onClick={() => router.push(backHref)}>
            {backLabel || 'Back to Duas'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
