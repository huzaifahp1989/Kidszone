'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Sparkles, Check, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePointsProgress } from '@/lib/points-progress-context';
import { useCompleteGameSession } from '@/lib/use-complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';

type Letter = {
  id: string;
  arabic: string;
  name: string;
  sound: string;
};

const LETTERS: Letter[] = [
  { id: 'alif', arabic: 'ا', name: 'Alif', sound: 'a' },
  { id: 'ba', arabic: 'ب', name: 'Ba', sound: 'b' },
  { id: 'ta', arabic: 'ت', name: 'Ta', sound: 't' },
  { id: 'tha', arabic: 'ث', name: 'Tha', sound: 'th' },
  { id: 'jim', arabic: 'ج', name: 'Jeem', sound: 'j' },
  { id: 'ha', arabic: 'ح', name: 'Ha', sound: 'h' },
  { id: 'kha', arabic: 'خ', name: 'Kha', sound: 'kh' },
  { id: 'dal', arabic: 'د', name: 'Dal', sound: 'd' },
  { id: 'ra', arabic: 'ر', name: 'Ra', sound: 'r' },
  { id: 'zay', arabic: 'ز', name: 'Zay', sound: 'z' },
  { id: 'sin', arabic: 'س', name: 'Sin', sound: 's' },
  { id: 'shin', arabic: 'ش', name: 'Shin', sound: 'sh' },
];

type TileKind = 'letter' | 'name';

type Tile = {
  uid: string;
  pairId: string;
  kind: TileKind;
  label: string;
  sub?: string;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTiles(letters: Letter[]): Tile[] {
  const tiles: Tile[] = [];
  for (const l of letters) {
    tiles.push({ uid: `${l.id}-letter`, pairId: l.id, kind: 'letter', label: l.arabic });
    tiles.push({ uid: `${l.id}-name`, pairId: l.id, kind: 'name', label: l.name, sub: `/${l.sound}/` });
  }
  return shuffle(tiles);
}

const ROUND_SIZE = 6;

export default function ArabicLetterMatchPage() {
  const { user } = useAuth();
  const completeGameSession = useCompleteGameSession();
  const { showPointsProgress } = usePointsProgress();

  const [round, setRound] = useState(0);
  const [letters] = useState(() => shuffle(LETTERS).slice(0, ROUND_SIZE));
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(shuffle(LETTERS).slice(0, ROUND_SIZE)));
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardMessage, setAwardMessage] = useState<string | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const claimedRef = useRef(false);

  const totalPairs = letters.length;
  const matchedPairs = matched.size / 2;

  const reset = useCallback(() => {
    const pool = shuffle(LETTERS).slice(0, ROUND_SIZE);
    setTiles(buildTiles(pool));
    setSelected(null);
    setMatched(new Set());
    setWrong(new Set());
    setMoves(0);
    setWon(false);
    setAwardMessage(null);
    setPointsAwarded(0);
    claimedRef.current = false;
  }, []);

  const nextRound = useCallback(() => {
    setRound((r) => r + 1);
    reset();
  }, [reset]);

  const awardOnce = useCallback(async () => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    setAwarding(true);
    try {
      const result = await completeGameSession({
        userId: user?.id ?? '',
        gameId: 'arabic-letter-match',
        gameTitle: 'Arabic Letter Matching',
        difficulty: 'easy',
        tasksPlayed: totalPairs,
      });
      setPointsAwarded(result.pointsAwarded);
      if (result.pointsAwarded > 0) {
        showPointsProgress({
          activity: 'game',
          activityLabel: 'Arabic Letter Matching',
          pointsEarned: result.pointsAwarded,
        });
        setAwardMessage(`MashaAllah! You earned ${result.pointsAwarded} points!`);
      } else if (result.message) {
        setAwardMessage(result.message);
      } else {
        setAwardMessage('Nicely done! Come back tomorrow for more points.');
      }
    } catch {
      setAwardMessage('Great job! Points could not be saved right now.');
    } finally {
      setAwarding(false);
    }
  }, [completeGameSession, user?.id, showPointsProgress, totalPairs]);

  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === totalPairs && !won) {
      setWon(true);
      void awardOnce();
    }
  }, [matchedPairs, totalPairs, won, awardOnce]);

  const handleTileClick = (tile: Tile) => {
    if (won || matched.has(tile.uid) || wrong.has(tile.uid)) return;
    setMoves((m) => m + 1);

    if (!selected) {
      setSelected(tile);
      return;
    }
    if (selected.uid === tile.uid) {
      setSelected(null);
      return;
    }
    if (selected.pairId === tile.pairId && selected.kind !== tile.kind) {
      setMatched((prev) => new Set(prev).add(selected.uid).add(tile.uid));
      setSelected(null);
      setWrong(new Set());
    } else {
      setWrong(new Set([selected.uid, tile.uid]));
      const a = selected.uid;
      const b = tile.uid;
      setTimeout(() => {
        setWrong((prev) => {
          const next = new Set(prev);
          next.delete(a);
          next.delete(b);
          return next;
        });
      }, 600);
      setSelected(null);
    }
  };

  const progressPct = useMemo(
    () => Math.round((matchedPairs / totalPairs) * 100),
    [matchedPairs, totalPairs]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/games" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-600">
          <ArrowLeft size={16} /> Back to Games
        </Link>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-xl border-2 border-teal-200 bg-white px-3 py-1.5 text-sm font-bold text-teal-700 hover:bg-teal-50"
        >
          <RotateCcw size={14} /> Shuffle
        </button>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm border border-teal-100">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Sparkles size={18} />
          </span>
          <div>
            <h1 className="text-xl font-black text-sand-900">Arabic Letter Matching</h1>
            <p className="text-xs text-sand-600">
              Match each Arabic letter to its name. Tap a letter, then tap its name.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
            <span className="rounded-lg bg-teal-100 px-2 py-1">Round {round + 1}</span>
            <span className="rounded-lg bg-gold-100 px-2 py-1">Moves: {moves}</span>
          </div>
          <div className="text-sm font-bold text-sand-700">
            {matchedPairs}/{totalPairs} matched
          </div>
        </div>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-teal-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {won ? (
        <div className="mt-5 rounded-3xl border-2 border-gold-200 bg-gradient-to-br from-gold-50 to-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <Trophy size={28} />
          </div>
          <h2 className="text-2xl font-black text-sand-900">MashaAllah!</h2>
          <p className="mt-1 text-sm text-sand-600">You matched all the Arabic letters in {moves} moves.</p>
          <p className="mt-3 rounded-xl bg-white/70 px-4 py-2 text-sm font-bold text-teal-800">
            {awarding ? 'Saving your points…' : awardMessage ?? 'Well done!'}
            {pointsAwarded > 0 && <span className="ml-1">({pointsAwarded} pts)</span>}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={nextRound}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
            >
              <RotateCcw size={16} /> Play Again
            </button>
            <Link
              href="/games"
              className="inline-flex items-center gap-1 rounded-xl border-2 border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50"
            >
              More Games
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.uid);
            const isSelected = selected?.uid === tile.uid;
            const isWrong = wrong.has(tile.uid);
            return (
              <button
                key={tile.uid}
                onClick={() => handleTileClick(tile)}
                disabled={isMatched}
                className={[
                  'flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition-all',
                  isMatched
                    ? 'border-green-300 bg-green-50 opacity-60'
                    : isWrong
                      ? 'border-coral-400 bg-coral-50 animate-pulse'
                      : isSelected
                        ? 'border-teal-500 bg-teal-100 shadow-md scale-[1.03]'
                        : 'border-teal-100 bg-white hover:border-teal-300 hover:shadow-sm',
                ].join(' ')}
              >
                {tile.kind === 'letter' ? (
                  <span className="text-4xl font-black text-teal-800" dir="rtl">
                    {tile.label}
                  </span>
                ) : (
                  <>
                    <span className="text-base font-bold text-sand-900">{tile.label}</span>
                    {tile.sub && <span className="text-[10px] text-sand-500">{tile.sub}</span>}
                  </>
                )}
                {isMatched && (
                  <span className="absolute -mt-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-sand-500">
        Complete a round to earn up to {ACTIVITY_BONUS_POINTS} activity points (daily limits apply).
      </p>
    </div>
  );
}
