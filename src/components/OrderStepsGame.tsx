'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { OrderStep } from '@/data/kids-new-activities';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type OrderStepsGameProps = {
  title: string;
  emoji: string;
  blurb: string;
  gameId: string;
  steps: OrderStep[];
  accent?: 'teal' | 'sky' | 'violet';
};

const ACCENT = {
  teal: {
    page: 'from-teal-50 to-white',
    title: 'text-teal-900',
    back: 'text-teal-800',
    card: 'border-teal-100',
    btn: 'from-teal-500 to-teal-700',
    chip: 'border-teal-200 bg-white hover:border-teal-400',
  },
  sky: {
    page: 'from-sky-50 to-white',
    title: 'text-sky-900',
    back: 'text-sky-800',
    card: 'border-sky-100',
    btn: 'from-sky-500 to-sky-700',
    chip: 'border-sky-200 bg-white hover:border-sky-400',
  },
  violet: {
    page: 'from-violet-50 to-white',
    title: 'text-violet-900',
    back: 'text-violet-800',
    card: 'border-violet-100',
    btn: 'from-violet-500 to-violet-700',
    chip: 'border-violet-200 bg-white hover:border-violet-400',
  },
} as const;

export function OrderStepsGame({
  title,
  emoji,
  blurb,
  gameId,
  steps: correctOrder,
  accent = 'teal',
}: OrderStepsGameProps) {
  const router = useRouter();
  const { user } = useAuth();
  const theme = ACCENT[accent];

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'success' | 'fail'>('menu');
  const [steps, setSteps] = useState<OrderStep[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<number>>(new Set());
  const pointsAwardedRef = useRef(false);

  const startGame = () => {
    pointsAwardedRef.current = false;
    setSteps(shuffleArray(correctOrder));
    setSelected(null);
    setWrongIds(new Set());
    setGameState('playing');
  };

  const handleTap = useCallback(
    (idx: number) => {
      if (selected === null) {
        setSelected(idx);
        return;
      }
      if (selected === idx) {
        setSelected(null);
        return;
      }
      setSteps((prev) => {
        const next = [...prev];
        [next[selected], next[idx]] = [next[idx], next[selected]];
        return next;
      });
      setSelected(null);
    },
    [selected]
  );

  const checkOrder = () => {
    const wrong = new Set<number>();
    steps.forEach((step, i) => {
      if (step.id !== correctOrder[i].id) wrong.add(step.id);
    });
    setWrongIds(wrong);
    if (wrong.size === 0) {
      setGameState('success');
      if (user?.id && !pointsAwardedRef.current) {
        pointsAwardedRef.current = true;
        completeGameSession({
          userId: user.id,
          gameId,
          gameTitle: title,
          trackCompetition: true,
        }).catch(() => {});
      }
    } else {
      setGameState('fail');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.page} p-4 pb-20`}>
      <button
        type="button"
        onClick={() => router.push('/games')}
        className={`mb-4 flex items-center gap-2 font-bold ${theme.back}`}
      >
        <ArrowLeft size={18} /> Games
      </button>

      <div className="mb-6 text-center">
        <h1 className={`text-3xl font-black ${theme.title}`}>
          {emoji} {title}
        </h1>
        <p className="text-sm text-gray-500">{blurb}</p>
      </div>

      {gameState === 'menu' && (
        <div className={`mx-auto max-w-sm rounded-3xl border ${theme.card} bg-white p-8 text-center shadow-lg`}>
          <div className="mb-4 text-6xl">{emoji}</div>
          <h2 className={`mb-4 text-2xl font-bold ${theme.title}`}>How to Play</h2>
          <div className="mb-6 space-y-3 text-left text-gray-700">
            <div className="flex items-start gap-3 rounded-2xl bg-sand-50 p-3">
              <span className="text-2xl">👆</span>
              <div>
                <strong>Tap</strong> a step to select it
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-3">
              <span className="text-2xl">🔄</span>
              <div>
                <strong>Tap another</strong> to swap their order
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-3">
              <span className="text-2xl">✅</span>
              <div>
                Press <strong>Check Order</strong> when ready
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={startGame}
            className={`rounded-2xl bg-gradient-to-r ${theme.btn} px-8 py-4 text-xl font-black text-white shadow-lg transition hover:opacity-90 active:scale-95`}
          >
            Start Game ✨
          </button>
        </div>
      )}

      {gameState === 'success' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-green-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-7xl">🎉</div>
          <h2 className="mb-2 text-3xl font-black text-green-700">MashaAllah!</h2>
          <p className="mb-1 text-lg text-gray-600">You put every step in the right order!</p>
          <p className="mb-6 text-sm text-gray-400">+{ACTIVITY_BONUS_POINTS} points (if under daily game limit) 🌟</p>
          <button
            type="button"
            onClick={startGame}
            className={`rounded-2xl bg-gradient-to-r ${theme.btn} px-6 py-3 font-bold text-white`}
          >
            ↺ Play Again
          </button>
        </div>
      )}

      {gameState === 'fail' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-6xl">🤔</div>
          <h2 className="mb-2 text-2xl font-bold text-red-700">Not quite right</h2>
          <p className="mb-6 text-gray-600">Highlighted steps are in the wrong place. Try again!</p>
          <button
            type="button"
            onClick={() => {
              setWrongIds(new Set());
              setSelected(null);
              setGameState('playing');
            }}
            className={`rounded-2xl bg-gradient-to-r ${theme.btn} px-6 py-3 font-bold text-white`}
          >
            Try Again
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="mx-auto max-w-md space-y-3">
          {steps.map((step, idx) => {
            const isWrong = wrongIds.has(step.id);
            const isSelected = selected === idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleTap(idx)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition-all ${
                  isWrong
                    ? 'border-red-400 bg-red-50'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                      : theme.chip
                }`}
              >
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <p className="text-lg font-bold text-gray-800">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.subtitle}</p>
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={checkOrder}
            className={`mt-2 w-full rounded-2xl bg-gradient-to-r ${theme.btn} py-4 text-lg font-black text-white shadow-lg`}
          >
            Check Order ✓
          </button>
        </div>
      )}
    </div>
  );
}
