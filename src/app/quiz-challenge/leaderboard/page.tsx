'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { CHALLENGE_QUIZ_KEYS, CHALLENGE_QUIZZES, type ChallengeQuizKey } from '@/data/challenge-quizzes';
import { Trophy, ArrowLeft, Medal } from 'lucide-react';

interface Entry {
  rank: number;
  uid: string;
  name: string;
  score: number;
  total: number;
  bonusScore: number;
  passed: boolean;
  completedAt: string | null;
}

export default function QuizChallengeLeaderboardPage() {
  const { profile } = useAuth();
  const [tab, setTab] = React.useState<ChallengeQuizKey>('quran-stories');
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tableMissing, setTableMissing] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/quiz-challenge/leaderboard?quiz=${tab}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        setEntries(Array.isArray(json.entries) ? json.entries : []);
        setTableMissing(Boolean(json.tableMissing));
      } catch {
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tab]);

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="text-center">
          <Link href="/quiz-challenge" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:underline">
            <ArrowLeft size={15} /> Back to Quiz Challenge
          </Link>
          <h1 className="text-3xl font-black text-teal-900 md:text-4xl">🏆 Challenge Leaderboard</h1>
          <p className="mt-1 text-sand-700">Each child appears once — only their single attempt counts.</p>
        </div>

        <div className="mx-auto flex max-w-md rounded-2xl border border-teal-300/40 bg-white p-1 shadow-sm">
          {CHALLENGE_QUIZ_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                tab === key ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow' : 'text-teal-700 hover:bg-teal-50'
              }`}
            >
              {CHALLENGE_QUIZZES[key].emoji} {CHALLENGE_QUIZZES[key].title}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 rounded-2xl border border-teal-300/30 bg-white p-6 shadow">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-teal-100" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-teal-300/30 bg-white p-8 text-center shadow">
            <Trophy size={40} className="mx-auto mb-3 text-teal-300" />
            <p className="font-bold text-teal-900">No scores yet</p>
            <p className="text-sand-700">
              {tableMissing
                ? 'The challenge is not fully set up yet. Ask an admin to run the setup.'
                : 'Be the first to complete this quiz and top the board!'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-teal-300/30 bg-white shadow-lg">
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-2 border-b border-teal-300/20 bg-teal-50 px-3 py-3 text-xs font-bold uppercase tracking-wide text-teal-700 sm:px-4">
              <span>Rank</span>
              <span>Learner</span>
              <span className="justify-self-end text-right">Score</span>
            </div>
            <div className="divide-y divide-[#c4b5fd]/20">
              {entries.map((entry) => {
                const you = entry.uid === profile?.uid;
                return (
                  <div
                    key={entry.uid}
                    className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 sm:px-4 ${you ? 'bg-violet-50/80 ring-1 ring-inset ring-violet-200' : ''}`}
                  >
                    <span className="text-lg font-black text-sand-700">{medal(entry.rank)}</span>
                    <span className="flex min-w-0 items-center gap-2 font-bold text-teal-900">
                      <span className="truncate">{entry.name}</span>
                      {you ? (
                        <span className="shrink-0 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">You</span>
                      ) : null}
                      {entry.passed ? <Medal size={14} className="shrink-0 text-amber-500" /> : null}
                    </span>
                    <span className="shrink-0 justify-self-end whitespace-nowrap text-right font-black text-teal-600">
                      {entry.score}/{entry.total}
                      {entry.bonusScore ? <span className="block text-[10px] font-bold text-amber-600">+{entry.bonusScore} bonus</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
