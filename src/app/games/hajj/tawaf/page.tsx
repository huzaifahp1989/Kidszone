'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

const C = 200;          // SVG center x & y
const R = 130;          // orbit radius
const START_DEG = -90;  // top of circle (12 o'clock)
const SPEED = 2.5;      // degrees per animation frame
const TOTAL_ROUNDS = 7;

function polar(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: C + R * Math.cos(rad), y: C + R * Math.sin(rad) };
}

export default function TawafGame() {
  const router = useRouter();
  const { user } = useAuth() as any;

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
  const [rounds, setRounds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playerPos, setPlayerPos] = useState(() => polar(START_DEG));

  const rawDegRef   = useRef(START_DEG);
  const walkingRef  = useRef(false);
  const rafRef      = useRef<number>(0);
  const tickRef     = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    if (walkingRef.current) rawDegRef.current -= SPEED;

    const completed = START_DEG - rawDegRef.current;   // accumulates positively as CCW
    const r = Math.floor(completed / 360);
    const p = (completed % 360) / 360;

    setPlayerPos(polar(rawDegRef.current));
    setRounds(r);
    setProgress(p);

    if (r >= TOTAL_ROUNDS) {
      setGameState('complete');
      return;
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); walkingRef.current = true; }
    };
    const onUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) walkingRef.current = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, tick]);

  const startGame = () => {
    rawDegRef.current = START_DEG;
    walkingRef.current = false;
    setRounds(0);
    setProgress(0);
    setPlayerPos(polar(START_DEG));
    setGameState('playing');
  };

  const pointsAwardedRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (!user?.id || pointsAwardedRef.current) return;
    pointsAwardedRef.current = true;
    await completeGameSession({
      userId: user.id,
      gameId: 'hajj-tawaf',
      gameTitle: 'Hajj Tawaf',
      trackCompetition: true,
    });
  }, [user]);

  useEffect(() => {
    if (gameState === 'complete') handleComplete();
  }, [gameState, handleComplete]);

  const px = playerPos.x;
  const py = playerPos.y;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-amber-50 p-4 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 font-bold">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-blue-900">🕋 Tawaf Game</h1>
        <p className="text-gray-500 text-sm">Circle the Kaaba 7 times anti-clockwise</p>
      </div>

      {/* ── MENU ───────────────────────────────────────── */}
      {gameState === 'menu' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-blue-100">
          <div className="text-6xl mb-4">🕋</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-4">How to Play</h2>
          <div className="text-left space-y-3 text-gray-700 mb-6">
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-2xl">
              <span className="text-2xl">⌨️</span>
              <div><strong>Desktop:</strong> Hold ← Arrow or A to walk</div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 p-3 rounded-2xl">
              <span className="text-2xl">📱</span>
              <div><strong>Mobile:</strong> Hold the WALK button below the arena</div>
            </div>
            <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-2xl">
              <span className="text-2xl">🔄</span>
              <div>Complete <strong>7 anti-clockwise rounds</strong> to finish Tawaf!</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white font-black text-xl px-8 py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            Start Tawaf ✨
          </button>
        </div>
      )}

      {/* ── COMPLETE ───────────────────────────────────── */}
      {gameState === 'complete' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-green-100">
          <div className="text-7xl mb-3">🎉</div>
          <h2 className="text-3xl font-black text-green-700 mb-2">Tawaf Complete!</h2>
          <p className="text-gray-600 mb-1 text-lg">MashaAllah! All 7 rounds completed!</p>
          <p className="text-gray-400 text-sm mb-2">+{ACTIVITY_BONUS_POINTS} points awarded 🌟</p>
          <p className="text-gray-400 text-sm mb-6">May Allah accept your Tawaf 🤲</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={startGame} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-700">
              ↺ Play Again
            </button>
            <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold px-6 py-3 rounded-2xl hover:bg-gray-200">
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── PLAYING ────────────────────────────────────── */}
      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-4">
          {/* Round dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 font-bold text-sm flex items-center justify-center transition-all ${
                  i < rounds
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-72 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full"
              style={{ width: `${progress * 100}%`, transition: 'width 0.05s linear' }}
            />
          </div>

          {/* SVG arena */}
          <div
            className="rounded-3xl shadow-lg overflow-hidden border-2 border-blue-100 bg-white"
            style={{ touchAction: 'none' }}
          >
            <svg viewBox="0 0 400 400" width={360} height={360} className="block max-w-full">
              {/* Sand ground */}
              <defs>
                <radialGradient id="tg" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#fef9ee" />
                  <stop offset="100%" stopColor="#fde68a" />
                </radialGradient>
              </defs>
              <rect width="400" height="400" fill="url(#tg)" />

              {/* Orbit path (dashed circle) */}
              <circle cx={C} cy={C} r={R} fill="none" stroke="#93c5fd" strokeWidth="4" strokeDasharray="12 6" />

              {/* Start marker at top (yellow dot = Black Stone corner) */}
              <circle cx={C} cy={C - R} r={7} fill="#fbbf24" stroke="white" strokeWidth="2" />
              <text x={C + 10} y={C - R + 4} fill="#92400e" fontSize="10" fontWeight="bold">Start</text>

              {/* Direction hint */}
              <text x="12" y="36" fill="#64748b" fontSize="12" fontWeight="bold">↰ anti-clockwise</text>

              {/* Kaaba */}
              <rect x={C - 44} y={C - 44} width="88" height="88" fill="#111827" rx="6" />
              {/* Gold kiswa band */}
              <rect x={C - 44} y={C - 44} width="88" height="16" fill="#b45309" rx="6" />
              <rect x={C - 44} y={C + 28} width="88" height="16" fill="#b45309" />
              {/* Arabic text */}
              <text x={C} y={C + 8} textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="bold" fontFamily="serif">
                الكعبة
              </text>

              {/* Player silhouette */}
              {/* body */}
              <ellipse cx={px} cy={py + 3} rx={8} ry={10} fill="#2563eb" />
              {/* head */}
              <circle cx={px} cy={py - 9} r={6} fill="#2563eb" />
              {/* white highlight */}
              <circle cx={px - 2} cy={py - 11} r={2} fill="white" opacity="0.6" />
            </svg>
          </div>

          {/* Mobile walk button */}
          <button
            onPointerDown={() => { walkingRef.current = true; }}
            onPointerUp={() => { walkingRef.current = false; }}
            onPointerLeave={() => { walkingRef.current = false; }}
            onPointerCancel={() => { walkingRef.current = false; }}
            className="w-64 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-black text-2xl py-5 rounded-3xl shadow-lg active:opacity-80 active:scale-95 transition-all select-none"
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            ← Walk
          </button>
          <p className="text-gray-400 text-sm">Hold button or hold ← key to walk</p>
        </div>
      )}
    </div>
  );
}
