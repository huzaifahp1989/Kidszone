'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { useAuth } from '@/lib/auth-context';

const GW = 400;         // game width (SVG viewBox)
const GH = 220;         // game height
const HILL_W = 60;      // hill width
const FLOOR_Y = 180;    // ground level y
const PLAYER_R = 14;
const SPEED = 3;        // px per frame
const SAFA_EDGE = HILL_W;           // right edge of Safa hill
const MARWAH_EDGE = GW - HILL_W;    // left edge of Marwah hill
const GREEN_L = SAFA_EDGE + 20;     // green zone start
const GREEN_R = MARWAH_EDGE - 20;   // green zone end
const TOTAL_LAPS = 7;

// Player y (standing on ground)
const PLAYER_Y = FLOOR_Y - PLAYER_R;

export default function SafaMarwahGame() {
  const router = useRouter();
  const { user } = useAuth() as any;

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'complete'>('menu');
  const [laps, setLaps] = useState(0);
  const [playerX, setPlayerX] = useState(SAFA_EDGE + PLAYER_R);
  const [inGreen, setInGreen] = useState(false);

  const xRef         = useRef(SAFA_EDGE + PLAYER_R);
  const keysRef      = useRef({ left: false, right: false });
  const lastHillRef  = useRef<'safa' | 'marwah'>('safa'); // start at Safa
  const lapsRef      = useRef(0);
  const rafRef       = useRef<number>(0);
  const tickRef      = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    let nx = xRef.current;
    const spd = (nx >= GREEN_L && nx <= GREEN_R) ? SPEED * 1.4 : SPEED;
    if (keysRef.current.left)  nx = Math.max(SAFA_EDGE + PLAYER_R, nx - spd);
    if (keysRef.current.right) nx = Math.min(MARWAH_EDGE - PLAYER_R, nx + spd);
    xRef.current = nx;

    const green = nx >= GREEN_L && nx <= GREEN_R;
    setInGreen(green);
    setPlayerX(nx);

    // Lap detection
    if (nx <= SAFA_EDGE + PLAYER_R && lastHillRef.current !== 'safa') {
      lastHillRef.current = 'safa';
      lapsRef.current += 1;
      setLaps(lapsRef.current);
      if (lapsRef.current >= TOTAL_LAPS) { setGameState('complete'); return; }
    } else if (nx >= MARWAH_EDGE - PLAYER_R && lastHillRef.current !== 'marwah') {
      lastHillRef.current = 'marwah';
      lapsRef.current += 1;
      setLaps(lapsRef.current);
      if (lapsRef.current >= TOTAL_LAPS) { setGameState('complete'); return; }
    }

    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { e.preventDefault(); keysRef.current.left  = true; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); keysRef.current.right = true; }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keysRef.current.left  = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
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
    xRef.current = SAFA_EDGE + PLAYER_R;
    keysRef.current = { left: false, right: false };
    lastHillRef.current = 'safa';
    lapsRef.current = 0;
    setLaps(0);
    setPlayerX(SAFA_EDGE + PLAYER_R);
    setGameState('playing');
  };

  const pointsAwardedRef = useRef(false);

  useEffect(() => {
    if (gameState !== 'complete' || !user?.id || pointsAwardedRef.current) return;
    pointsAwardedRef.current = true;
    completeGameSession({
      userId: user.id,
      gameId: 'hajj-safa-marwah',
      gameTitle: 'Safa & Marwah',
      trackCompetition: true,
    }).catch(() => {});
  }, [gameState, user]);

  const px = playerX;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-emerald-700 mb-4 font-bold">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="text-center mb-4">
        <h1 className="text-3xl font-black text-emerald-900">🏃 Safa &amp; Marwah</h1>
        <p className="text-gray-500 text-sm">Walk 7 laps between the two sacred hills</p>
      </div>

      {/* ── MENU ───────────────────────────────────────── */}
      {gameState === 'menu' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-emerald-100">
          <div className="text-6xl mb-4">🏔️</div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-4">How to Play</h2>
          <div className="text-left space-y-3 text-gray-700 mb-6">
            <div className="flex items-start gap-3 bg-emerald-50 p-3 rounded-2xl">
              <span className="text-2xl">⌨️</span>
              <div><strong>Desktop:</strong> Hold ← → Arrow keys or A / D</div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-2xl">
              <span className="text-2xl">📱</span>
              <div><strong>Mobile:</strong> Hold the ← → buttons below the arena</div>
            </div>
            <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-2xl">
              <span className="text-2xl">💚</span>
              <div>Speed up in the <strong>green zone</strong> in the middle!</div>
            </div>
            <div className="flex items-start gap-3 bg-rose-50 p-3 rounded-2xl">
              <span className="text-2xl">🏁</span>
              <div>Walk <strong>7 laps</strong> back and forth to complete Sa&apos;i!</div>
            </div>
          </div>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black text-xl px-8 py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            Start Sa&apos;i ✨
          </button>
        </div>
      )}

      {/* ── COMPLETE ───────────────────────────────────── */}
      {gameState === 'complete' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl p-8 shadow-lg text-center border border-emerald-100">
          <div className="text-7xl mb-3">🎉</div>
          <h2 className="text-3xl font-black text-emerald-700 mb-2">Sa&apos;i Complete!</h2>
          <p className="text-gray-600 mb-1 text-lg">MashaAllah! All 7 laps completed!</p>
          <p className="text-gray-400 text-sm mb-2">+{ACTIVITY_BONUS_POINTS} points awarded 🌟</p>
          <p className="text-gray-400 text-sm mb-6">
            Just like Hagar (RA) searched for water — and Allah blessed her with Zamzam! 🤲
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={startGame} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-emerald-700">
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
          {/* Lap dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_LAPS }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 font-bold text-sm flex items-center justify-center transition-all ${
                  i < laps
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {inGreen && (
            <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-bold animate-pulse">
              ⚡ Green Zone — Speed Boost!
            </div>
          )}

          {/* SVG arena */}
          <div
            className="rounded-3xl shadow-lg overflow-hidden border-2 border-emerald-100 bg-white"
            style={{ touchAction: 'none' }}
          >
            <svg viewBox={`0 0 ${GW} ${GH}`} width={360} height={198} className="block max-w-full">
              {/* Sky */}
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="100%" stopColor="#fef9ee" />
                </linearGradient>
                <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <rect width={GW} height={GH} fill="url(#sky)" />

              {/* Ground */}
              <rect x="0" y={FLOOR_Y} width={GW} height={GH - FLOOR_Y} fill="url(#ground)" />

              {/* Green zone on ground */}
              <rect x={GREEN_L} y={FLOOR_Y} width={GREEN_R - GREEN_L} height={GH - FLOOR_Y} fill="#86efac" opacity="0.5" />
              <text x={(GREEN_L + GREEN_R) / 2} y={FLOOR_Y + 18} textAnchor="middle" fill="#15803d" fontSize="10" fontWeight="bold">
                ⚡ Green Zone
              </text>

              {/* Safa hill (left) */}
              <ellipse cx={HILL_W / 2} cy={FLOOR_Y} rx={HILL_W / 2 + 10} ry={55} fill="#6ee7b7" />
              <ellipse cx={HILL_W / 2} cy={FLOOR_Y} rx={HILL_W / 2 + 4} ry={48} fill="#34d399" />
              <text x={HILL_W / 2} y={FLOOR_Y - 30} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
                صفا
              </text>
              <text x={HILL_W / 2} y={FLOOR_Y - 16} textAnchor="middle" fill="white" fontSize="11">
                Safa
              </text>

              {/* Marwah hill (right) */}
              <ellipse cx={GW - HILL_W / 2} cy={FLOOR_Y} rx={HILL_W / 2 + 10} ry={55} fill="#6ee7b7" />
              <ellipse cx={GW - HILL_W / 2} cy={FLOOR_Y} rx={HILL_W / 2 + 4} ry={48} fill="#34d399" />
              <text x={GW - HILL_W / 2} y={FLOOR_Y - 30} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
                مروة
              </text>
              <text x={GW - HILL_W / 2} y={FLOOR_Y - 16} textAnchor="middle" fill="white" fontSize="11">
                Marwah
              </text>

              {/* Player */}
              <ellipse cx={px} cy={PLAYER_Y + 3} rx={8} ry={10} fill="#059669" />
              <circle cx={px} cy={PLAYER_Y - 9} r={6} fill="#059669" />
              <circle cx={px - 2} cy={PLAYER_Y - 11} r={2} fill="white" opacity="0.6" />
            </svg>
          </div>

          {/* Mobile controls */}
          <div className="flex gap-4" style={{ touchAction: 'none' }}>
            <button
              onPointerDown={() => { keysRef.current.left = true; }}
              onPointerUp={() => { keysRef.current.left = false; }}
              onPointerLeave={() => { keysRef.current.left = false; }}
              onPointerCancel={() => { keysRef.current.left = false; }}
              className="w-28 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black text-2xl py-5 rounded-3xl shadow-lg active:opacity-80 active:scale-95 transition-all select-none"
              style={{ userSelect: 'none' }}
            >
              ← Safa
            </button>
            <button
              onPointerDown={() => { keysRef.current.right = true; }}
              onPointerUp={() => { keysRef.current.right = false; }}
              onPointerLeave={() => { keysRef.current.right = false; }}
              onPointerCancel={() => { keysRef.current.right = false; }}
              className="w-28 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black text-2xl py-5 rounded-3xl shadow-lg active:opacity-80 active:scale-95 transition-all select-none"
              style={{ userSelect: 'none' }}
            >
              Marwah →
            </button>
          </div>
          <p className="text-gray-400 text-sm">Hold buttons or ← → keys to walk</p>
        </div>
      )}
    </div>
  );
}
