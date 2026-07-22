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
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="text-center">
          <Link href="/quiz-challenge" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#6d28d9] hover:underline">
            <ArrowLeft size={15} /> Back to Quiz Challenge
          </Link>
          <h1 className="text-3xl font-black text-[#1e1b4b] md:text-4xl">🏆 Challenge Leaderboard</h1>
          <p className="mt-1 text-[#475569]">Each child appears once — only their single attempt counts.</p>
        </div>

        <div className="mx-auto flex max-w-md rounded-2xl border border-[#c4b5fd]/40 bg-white p-1 shadow-sm">
          {CHALLENGE_QUIZ_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                tab === key ? 'bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white shadow' : 'text-[#6d28d9] hover:bg-[#f5f3ff]'
              }`}
            >
              {CHALLENGE_QUIZZES[key].emoji} {CHALLENGE_QUIZZES[key].title}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 rounded-2xl border border-[#c4b5fd]/30 bg-white p-6 shadow">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-[#ede9fe]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-[#c4b5fd]/30 bg-white p-8 text-center shadow">
            <Trophy size={40} className="mx-auto mb-3 text-[#c4b5fd]" />
            <p className="font-bold text-[#1e1b4b]">No scores yet</p>
            <p className="text-[#475569]">
              {tableMissing
                ? 'The challenge is not fully set up yet. Ask an admin to run the setup.'
                : 'Be the first to complete this quiz and top the board!'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#c4b5fd]/30 bg-white shadow-lg">
            <div className="grid grid-cols-[3rem_1fr_5rem] gap-2 border-b border-[#c4b5fd]/20 bg-[#f5f3ff] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#6d28d9]">
              <span>Rank</span>
              <span>Learner</span>
              <span className="text-right">Score</span>
            </div>
            <div className="divide-y divide-[#c4b5fd]/20">
              {entries.map((entry) => {
                const you = entry.uid === profile?.uid;
                return (
                  <div
                    key={entry.uid}
                    className={`grid grid-cols-[3rem_1fr_5rem] items-center gap-2 px-4 py-3 ${you ? 'bg-violet-50/80 ring-1 ring-inset ring-violet-200' : ''}`}
                  >
                    <span className="text-lg font-black text-[#475569]">{medal(entry.rank)}</span>
                    <span className="flex items-center gap-2 font-bold text-[#1e1b4b]">
                      <span className="break-words">{entry.name}</span>
                      {you ? (
                        <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">You</span>
                      ) : null}
                      {entry.passed ? <Medal size={14} className="text-amber-500" /> : null}
                    </span>
                    <span className="text-right font-black text-[#7c3aed]">
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
