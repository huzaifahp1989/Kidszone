'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { CHALLENGE_QUIZ_KEYS, CHALLENGE_QUIZZES, CHALLENGE_TIMER_SECONDS } from '@/data/challenge-quizzes';
import { Trophy, Clock, PenLine, Award, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

interface StatusResult {
  score: number;
  total: number;
  bonusScore: number;
  passed: boolean;
  awardedBadge: boolean;
}

export default function QuizChallengePage() {
  const { user, loading } = useAuth();
  const [statuses, setStatuses] = React.useState<Record<string, StatusResult | null>>({});

  React.useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const next: Record<string, StatusResult | null> = {};
      for (const key of CHALLENGE_QUIZ_KEYS) {
        try {
          const res = await authJsonFetch(`/api/quiz-challenge/status?quiz=${key}`);
          const json = await res.json();
          next[key] = json?.completed ? (json.result as StatusResult) : null;
        } catch {
          next[key] = null;
        }
      }
      if (active) setStatuses(next);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-black text-teal-900 md:text-5xl">🌙 Islamic Quiz Challenge</h1>
          <p className="mx-auto max-w-2xl text-lg text-sand-700">
            Test what you know! Type your answers, beat the timer, and earn your place on the leaderboard. Each
            quiz can be played <span className="font-bold text-teal-700">only once</span>, so do your best!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-sm font-semibold text-teal-700">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <Clock size={15} /> 20-minute timer
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <PenLine size={15} /> Type your answers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <ShieldCheck size={15} /> One attempt each
            </span>
          </div>
        </div>

        {!loading && !user ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-800">
            <p className="font-bold">Please sign in to take the quizzes and save your score.</p>
            <Link
              href="/signin?next=/quiz-challenge"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white shadow transition hover:bg-teal-700"
            >
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}

        <Link
          href="/competitions/rabi-ul-awwal"
          className="block rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-amber-50 p-6 shadow-lg"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">Rabi ul Awwal</p>
          <h2 className="mt-1 text-2xl font-black text-emerald-950">Written Seerah Quiz</h2>
          <p className="mt-2 text-sm text-emerald-900/80">
            Not multiple choice. Type your own answers about the life of Prophet Muhammad ﷺ. Admin marks every entry.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
            Enter the competition <ArrowRight size={16} />
          </span>
        </Link>

        <div className="grid gap-5 sm:grid-cols-2">
          {CHALLENGE_QUIZ_KEYS.map((key) => {
            const quiz = CHALLENGE_QUIZZES[key];
            const status = statuses[key];
            const mainCount = quiz.questions.filter((q) => !q.isBonus).length;
            const bonusCount = quiz.questions.length - mainCount;
            return (
              <div
                key={key}
                className="flex flex-col rounded-3xl border border-teal-300/40 bg-white p-6 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
                    {quiz.emoji}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-teal-900">{quiz.title}</h2>
                    </div>
                    <p className="text-sm font-semibold text-teal-600">
                      {mainCount} questions{bonusCount ? ` + ${bonusCount} bonus` : ''}
                    </p>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-6 text-sand-700">{quiz.description}</p>

                {quiz.awardsBadge ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    <Award size={14} /> Earn a certificate for {quiz.passScore}/{mainCount} or above!
                  </p>
                ) : null}

                {status ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                      <CheckCircle2 size={16} /> Completed
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-800">
                      {status.score}/{status.total}
                      {status.bonusScore ? <span className="text-base"> (+{status.bonusScore} bonus)</span> : null}
                    </p>
                    <Link
                      href={`/quiz-challenge/${key}`}
                      className="mt-2 inline-block text-xs font-bold text-emerald-700 underline-offset-2 hover:underline"
                    >
                      View my answers →
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/quiz-challenge/${key}`}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Start {quiz.title} <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/quiz-challenge/leaderboard"
            className="inline-flex items-center gap-2 rounded-xl border border-teal-600/30 bg-white px-5 py-3 font-bold text-teal-700 shadow-sm transition hover:bg-teal-50"
          >
            <Trophy size={18} /> View the Challenge Leaderboard
          </Link>
        </div>

        <p className="text-center text-xs text-sand-400">
          Time allowed: {Math.round(CHALLENGE_TIMER_SECONDS / 60)} minutes per quiz. All questions are based on
          the Quran and authentic Sunnah.
        </p>
      </div>
    </div>
  );
}
