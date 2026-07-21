'use client';
import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

interface Step {
  id: number;
  icon: string;
  title: string;
  description: string;
}

const CORRECT_ORDER: Step[] = [
  {
    id: 1,
    icon: '🤍',
    title: 'Ihram',
    description: 'Wear white garments and make your intention (Niyyah)',
  },
  {
    id: 2,
    icon: '🕋',
    title: 'Tawaf',
    description: 'Circle the Kaaba 7 times in an anti-clockwise direction',
  },
  {
    id: 3,
    icon: '🏃',
    title: "Sa'i",
    description: 'Walk between the hills of Safa and Marwah 7 times',
  },
  {
    id: 4,
    icon: '☀️',
    title: 'Wuquf at Arafat',
    description: 'Stand on the Plain of Arafat on the 9th of Dhul Hijjah',
  },
  {
    id: 5,
    icon: '🌙',
    title: 'Muzdalifah',
    description: 'Stay overnight at Muzdalifah and collect 49 pebbles',
  },
  {
    id: 6,
    icon: '🪨',
    title: 'Rami al-Jamarat',
    description: 'Throw pebbles at the Jamarat pillars to symbolise rejecting Shaytan',
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HajjStepsGame() {
  const router = useRouter();
  const { user } = useAuth() as any;

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'success' | 'fail'>('menu');
  const [steps, setSteps] = useState<Step[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // index in steps[]
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
      // Swap
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
          gameId: 'hajj-steps',
          gameTitle: 'Hajj Steps',
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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white p-4 pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-rose-700 mb-4 font-bold">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-rose-900">🎯 Hajj Steps</h1>
        <p className="text-gray-500 text-sm">Arrange the Hajj rituals in the correct order</p>
      </div>

      {/* ── MENU ───────────────────────────────────────── */}
      {gameState === 'menu' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-rose-100">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-rose-800 mb-4">How to Play</h2>
          <div className="text-left space-y-3 text-gray-700 mb-6">
            <div className="flex items-start gap-3 bg-rose-50 p-3 rounded-2xl">
              <span className="text-2xl">👆</span>
              <div><strong>Tap</strong> a step to select it (it turns blue)</div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-2xl">
              <span className="text-2xl">🔄</span>
              <div><strong>Tap another</strong> step to swap their positions</div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 p-3 rounded-2xl">
              <span className="text-2xl">✅</span>
              <div>When you think it's right, press <strong>Check Order</strong>!</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-rose-500 to-rose-700 text-white font-black text-xl px-8 py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            Start Game ✨
          </button>
        </div>
      )}

      {/* ── SUCCESS ────────────────────────────────────── */}
      {gameState === 'success' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-green-100">
          <div className="text-7xl mb-3">🎉</div>
          <h2 className="text-3xl font-black text-green-700 mb-2">Correct Order!</h2>
          <p className="text-gray-600 mb-1 text-lg">MashaAllah! You arranged all 6 steps correctly!</p>
          <p className="text-gray-400 text-sm mb-2">+{ACTIVITY_BONUS_POINTS} points awarded 🌟</p>
          <p className="text-gray-400 text-sm mb-2">Attempts: {attempts}</p>
          <p className="text-gray-400 text-sm mb-6">
            You now know the order of Hajj rituals. May Allah grant you Hajj one day! 🤲
          </p>
          {/* Show the correct order as a visual reminder */}
          <div className="text-left space-y-1 mb-6">
            {CORRECT_ORDER.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-base">{s.icon}</span>
                <span className="font-semibold">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={startGame} className="bg-rose-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-rose-700">
              ↺ Play Again
            </button>
            <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-2xl hover:bg-gray-200">
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── FAIL ───────────────────────────────────────── */}
      {gameState === 'fail' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-orange-100">
          <div className="text-7xl mb-3">🤔</div>
          <h2 className="text-2xl font-black text-orange-700 mb-2">Not Quite Right!</h2>
          <p className="text-gray-600 mb-2">
            {wrongIds.size} step{wrongIds.size > 1 ? 's are' : ' is'} in the wrong place. Keep trying!
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Hint: Hajj starts with <strong>Ihram</strong> and the most important ritual is standing at <strong>Arafat</strong>.
          </p>
          <button
            onClick={tryAgain}
            className="bg-orange-500 text-white font-bold px-6 py-3 rounded-2xl hover:bg-orange-600"
          >
            Try Again →
          </button>
        </div>
      )}

      {/* ── PLAYING ────────────────────────────────────── */}
      {gameState === 'playing' && (
        <div className="max-w-xl mx-auto">
          {selected !== null && (
            <div className="bg-blue-100 text-blue-700 text-center px-4 py-2 rounded-2xl text-sm font-bold mb-3">
              👆 &quot;{steps[selected].title}&quot; selected — tap another step to swap
            </div>
          )}

          <div className="space-y-3 mb-6">
            {steps.map((step, i) => {
              const isSelected = selected === i;
              const isWrong = wrongIds.has(step.id);
              let cls =
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left ';
              if (isSelected) {
                cls += 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]';
              } else if (isWrong) {
                cls += 'border-red-400 bg-red-50';
              } else {
                cls += 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50 hover:shadow-sm';
              }

              return (
                <button key={step.id} className={cls} onClick={() => handleTap(i)}>
                  {/* Position number */}
                  <div
                    className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : isWrong
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {/* Icon */}
                  <span className="text-3xl shrink-0">{step.icon}</span>
                  {/* Text */}
                  <div className="flex-1 text-left">
                    <div
                      className={`font-black text-base ${
                        isSelected ? 'text-blue-800' : isWrong ? 'text-red-700' : 'text-gray-800'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                  </div>
                  {/* Drag handle hint */}
                  <div className="text-gray-300 text-lg shrink-0">⇅</div>
                </button>
              );
            })}
          </div>

          <button
            onClick={checkOrder}
            className="w-full bg-gradient-to-r from-rose-500 to-rose-700 text-white font-black text-xl py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            ✅ Check Order
          </button>
          <p className="text-center text-gray-400 text-sm mt-2">Attempts: {attempts}</p>
        </div>
      )}
    </div>
  );
}
