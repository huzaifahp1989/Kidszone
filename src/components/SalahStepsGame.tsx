'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

interface PrayerStep {
  id: number;
  icon: string;
  title: string;
  time: string;
}

const CORRECT_ORDER: PrayerStep[] = [
  { id: 1, icon: '🌅', title: 'Fajr', time: 'Dawn' },
  { id: 2, icon: '☀️', title: 'Dhuhr', time: 'Midday' },
  { id: 3, icon: '🌤️', title: 'Asr', time: 'Afternoon' },
  { id: 4, icon: '🌇', title: 'Maghrib', time: 'Sunset' },
  { id: 5, icon: '🌙', title: 'Isha', time: 'Night' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function SalahStepsGame() {
  const router = useRouter();
  const { user } = useAuth();

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'success' | 'fail'>('menu');
  const [steps, setSteps] = useState<PrayerStep[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongIds, setWrongIds] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const pointsAwardedRef = useRef(false);

  const startGame = () => {
    pointsAwardedRef.current = false;
    setSteps(shuffleArray(CORRECT_ORDER));
    setSelected(null);
    setWrongIds(new Set());
    setAttempts(0);
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
    setAttempts((a) => a + 1);
    const wrong = new Set<number>();
    steps.forEach((step, i) => {
      if (step.id !== CORRECT_ORDER[i].id) wrong.add(step.id);
    });
    setWrongIds(wrong);
    if (wrong.size === 0) {
      setGameState('success');
      if (user?.id && !pointsAwardedRef.current) {
        pointsAwardedRef.current = true;
        completeGameSession({
          userId: user.id,
          gameId: 'salah-steps',
          gameTitle: 'Salah Steps',
          trackCompetition: true,
        }).catch(() => {});
      }
    } else {
      setGameState('fail');
    }
  };

  const tryAgain = () => {
    setWrongIds(new Set());
    setSelected(null);
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4 pb-20">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 font-bold text-emerald-800">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-emerald-900">🕌 Salah Steps</h1>
        <p className="text-sm text-gray-500">Put the five daily prayers in order from Fajr to Isha</p>
      </div>

      {gameState === 'menu' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">🕌</div>
          <h2 className="mb-4 text-2xl font-bold text-emerald-800">How to Play</h2>
          <div className="mb-6 space-y-3 text-left text-gray-700">
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3">
              <span className="text-2xl">👆</span>
              <div><strong>Tap</strong> a prayer to select it</div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-3">
              <span className="text-2xl">🔄</span>
              <div><strong>Tap another</strong> to swap their order</div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-3">
              <span className="text-2xl">✅</span>
              <div>Press <strong>Check Order</strong> when ready!</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-8 py-4 text-xl font-black text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            Start Game ✨
          </button>
        </div>
      )}

      {gameState === 'success' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-green-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-7xl">🎉</div>
          <h2 className="mb-2 text-3xl font-black text-green-700">MashaAllah!</h2>
          <p className="mb-1 text-lg text-gray-600">You ordered all five prayers correctly!</p>
          <p className="mb-6 text-sm text-gray-400">+{ACTIVITY_BONUS_POINTS} points awarded 🌟</p>
          <div className="mb-6 space-y-1 text-left">
            {CORRECT_ORDER.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  {i + 1}
                </span>
                <span className="text-base">{s.icon}</span>
                <span className="font-semibold">{s.title}</span>
                <span className="text-gray-400">({s.time})</span>
              </div>
            ))}
          </div>
          <button onClick={startGame} className="rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">
            ↺ Play Again
          </button>
        </div>
      )}

      {gameState === 'fail' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-6xl">🤔</div>
          <h2 className="mb-2 text-2xl font-bold text-red-700">Not quite right</h2>
          <p className="mb-6 text-gray-600">The red prayers are in the wrong place. Try again!</p>
          <button onClick={tryAgain} className="rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">
            Try Again
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="mx-auto max-w-md space-y-4">
          {steps.map((step, idx) => {
            const isWrong = wrongIds.has(step.id);
            const isSelected = selected === idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleTap(idx)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  isWrong
                    ? 'border-red-400 bg-red-50'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                      : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <p className="text-lg font-bold text-gray-800">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.time}</p>
                </div>
              </button>
            );
          })}
          <button
            onClick={checkOrder}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 py-4 text-lg font-black text-white shadow-lg"
          >
            Check Order ✓
          </button>
        </div>
      )}
    </div>
  );
}
