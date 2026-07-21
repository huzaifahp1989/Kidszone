'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PROPHET_FACTS } from '@/data/kids-new-activities';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ProphetFactsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => shuffle(PROPHET_FACTS).slice(0, 5), [round]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const claimed = useRef(false);

  const q = questions[index];

  const pick = async (optionIndex: number) => {
    if (picked !== null || done) return;
    setPicked(optionIndex);
    const correct = optionIndex === q.correctIndex;
    const nextScore = score + (correct ? 1 : 0);
    if (correct) setScore(nextScore);

    window.setTimeout(async () => {
      if (index >= questions.length - 1) {
        setDone(true);
        if (user?.id && !claimed.current && nextScore >= 3) {
          claimed.current = true;
          const result = await completeGameSession({
            userId: user.id,
            gameId: 'prophet-facts',
            gameTitle: 'Prophet ﷺ Facts',
            trackCompetition: true,
          });
          setMessage(
            result.pointsAwarded > 0
              ? `⭐ +${result.pointsAwarded} points!`
              : result.message || 'Great Seerah practice!'
          );
        } else if (nextScore < 3) {
          setMessage('Get at least 3/5 correct to earn game points — try again!');
        }
        return;
      }
      setIndex((i) => i + 1);
      setPicked(null);
    }, 900);
  };

  const restart = () => {
    claimed.current = false;
    setIndex(0);
    setScore(0);
    setPicked(null);
    setDone(false);
    setMessage(null);
    setRound((r) => r + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4 pb-20">
      <button
        type="button"
        onClick={() => router.push('/games')}
        className="mb-4 flex items-center gap-2 font-bold text-amber-900"
      >
        <ArrowLeft size={18} /> Games
      </button>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-amber-950">🌟 Prophet ﷺ Facts</h1>
        <p className="text-sm text-gray-500">
          Answer 5 Seerah questions — score 3+ for up to +{ACTIVITY_BONUS_POINTS} game points
        </p>
      </div>

      {!done ? (
        <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-amber-100 bg-white p-6 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Question {index + 1} / {questions.length}
          </p>
          <h2 className="text-xl font-extrabold text-sand-900">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let style = 'border-sand-200 bg-sand-50 hover:border-amber-300';
              if (picked !== null) {
                if (i === q.correctIndex) style = 'border-emerald-400 bg-emerald-50';
                else if (i === picked) style = 'border-red-300 bg-red-50';
                else style = 'border-sand-100 opacity-60';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => void pick(i)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left font-semibold text-sand-900 ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className="text-sm font-medium text-teal-800">{q.tip}</p>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-sm rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-6xl">🎉</div>
          <h2 className="mb-2 text-2xl font-black text-amber-900">
            You scored {score}/{questions.length}
          </h2>
          <p className="mb-4 text-sand-600">{message || 'Keep learning the Seerah!'}</p>
          <button
            type="button"
            onClick={restart}
            className="rounded-2xl bg-amber-600 px-6 py-3 font-bold text-white"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
