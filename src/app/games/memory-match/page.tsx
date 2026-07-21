'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Timer, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { usePointsProgress } from '@/lib/points-progress-context';
import { completeGameSession } from '@/lib/complete-game-session';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { getMemoryDeck, type MemoryPair } from '@/data/memory-match';

type Card = {
  key: string;
  pairId: string;
  label: string;
  emoji?: string;
  face: 'A' | 'B';
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildCards(pairs: MemoryPair[]): Card[] {
  const cards: Card[] = [];
  for (const pair of pairs) {
    cards.push({
      key: `${pair.id}-a`,
      pairId: pair.id,
      label: pair.faceA,
      emoji: pair.emoji,
      face: 'A',
    });
    cards.push({
      key: `${pair.id}-b`,
      pairId: pair.id,
      label: pair.faceB,
      emoji: pair.emoji,
      face: 'B',
    });
  }
  return shuffle(cards);
}

export default function MemoryMatchPage() {
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const { isYounger } = useAgeMode();
  const { showPointsProgress } = usePointsProgress();

  const deck = useMemo(() => getMemoryDeck(isYounger), [isYounger]);
  const [cards, setCards] = useState<Card[]>(() => buildCards(deck.pairs));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timerOn, setTimerOn] = useState(!isYounger);
  const [won, setWon] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardMessage, setAwardMessage] = useState<string | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const claimedRef = React.useRef(false);

  useEffect(() => {
    claimedRef.current = false;
    setCards(buildCards(deck.pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setWon(false);
    setAwardMessage(null);
    setPointsAwarded(0);
    setTimerOn(!isYounger);
  }, [deck, isYounger]);

  useEffect(() => {
    if (!timerOn || won) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerOn, won]);

  const resetGame = useCallback(() => {
    claimedRef.current = false;
    setCards(buildCards(deck.pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setWon(false);
    setAwardMessage(null);
    setPointsAwarded(0);
    setBusy(false);
  }, [deck.pairs]);

  useEffect(() => {
    if (!won || !user?.id || claimedRef.current) return;
    claimedRef.current = true;
    let cancelled = false;

    (async () => {
      setAwarding(true);
      try {
        const result = await completeGameSession({
          userId: user.id,
          gameId: 'memory-match',
          gameTitle: 'Islamic Memory Match',
          difficulty: isYounger ? 'easy' : 'medium',
          tasksPlayed: deck.pairs.length,
          trackCompetition: true,
        });
        if (cancelled) return;

        setPointsAwarded(result.pointsAwarded);
        setAwardMessage(
          result.pointsAwarded > 0
            ? `+${result.pointsAwarded} points!`
            : result.message || 'Nice match! Come back tomorrow for more game points.'
        );

        if (result.profile) {
          updateLocalProfile?.({
            points: result.profile.points,
            weeklyPoints: result.profile.weeklyPoints,
            monthlyPoints: result.profile.monthlyPoints,
            todayPoints: result.profile.todayPoints,
          });
        }
        if (result.pointsAwarded > 0) {
          showPointsProgress?.({
            activity: 'game',
            activityLabel: 'Islamic Memory Match',
            pointsEarned: result.pointsAwarded,
          });
          await refreshProfile();
        }
      } catch {
        if (!cancelled) setAwardMessage('Could not save points. Try again later.');
      } finally {
        if (!cancelled) setAwarding(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [won, user?.id, isYounger, deck.pairs.length, updateLocalProfile, showPointsProgress, refreshProfile]);

  const onFlip = (key: string) => {
    if (busy || won || matched.has(key) || flipped.includes(key)) return;
    if (flipped.length >= 2) return;

    const next = [...flipped, key];
    setFlipped(next);

    if (next.length < 2) return;

    setMoves((m) => m + 1);
    setBusy(true);

    const [aKey, bKey] = next;
    const a = cards.find((c) => c.key === aKey);
    const b = cards.find((c) => c.key === bKey);

    if (a && b && a.pairId === b.pairId && a.key !== b.key) {
      window.setTimeout(() => {
        setMatched((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(aKey);
          nextSet.add(bKey);
          if (nextSet.size >= cards.length) {
            setWon(true);
          }
          return nextSet;
        });
        setFlipped([]);
        setBusy(false);
      }, 350);
    } else {
      window.setTimeout(() => {
        setFlipped([]);
        setBusy(false);
      }, 750);
    }
  };

  const tileClass = isYounger
    ? 'min-h-[5.5rem] text-base sm:min-h-[7rem] sm:text-lg'
    : 'min-h-[4.5rem] text-sm sm:min-h-[5.5rem] sm:text-base';

  return (
    <div className="min-h-screen bg-[#f0fdfa] pattern-islamic px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-700"
        >
          <ArrowLeft size={18} /> Back to Games
        </Link>

        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                {isYounger ? 'Younger deck' : 'Older deck'}
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold text-slate-900">
                Islamic Memory Match
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {isYounger
                  ? 'Flip two cards and find the matching pictures!'
                  : 'Match Arabic terms with their English meanings.'}{' '}
                Finish a round for up to +{ACTIVITY_BONUS_POINTS} game points.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-xl bg-violet-50 px-3 py-2 text-violet-800">Moves: {moves}</span>
              {!isYounger && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                  <Timer size={14} /> {seconds}s
                </span>
              )}
            </div>
          </div>

          {!isYounger && (
            <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={timerOn}
                onChange={(e) => setTimerOn(e.target.checked)}
                className="rounded border-violet-300"
              />
              Show timer
            </label>
          )}

          <div
            className={`mt-6 grid gap-3 ${
              isYounger ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'
            }`}
          >
            {cards.map((card) => {
              const isOpen = flipped.includes(card.key) || matched.has(card.key);
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => onFlip(card.key)}
                  disabled={busy && !isOpen}
                  className={`${tileClass} rounded-2xl border-2 p-3 font-bold shadow-sm transition ${
                    matched.has(card.key)
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                      : isOpen
                        ? 'border-violet-400 bg-violet-50 text-violet-900'
                        : 'border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:-translate-y-0.5'
                  }`}
                >
                  {isOpen ? (
                    <span className="flex flex-col items-center justify-center gap-1">
                      {card.emoji && <span className="text-2xl">{card.emoji}</span>}
                      <span>{card.label}</span>
                    </span>
                  ) : (
                    <span className="text-2xl">?</span>
                  )}
                </button>
              );
            })}
          </div>

          {won && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <Trophy className="mx-auto text-amber-600" size={36} />
              <h2 className="mt-2 text-xl font-bold text-slate-900">MashaAllah — all matched!</h2>
              <p className="mt-1 text-sm text-slate-700">
                {awarding ? 'Saving your points…' : awardMessage}
              </p>
              {pointsAwarded > 0 && (
                <p className="mt-1 text-lg font-black text-amber-700">+{pointsAwarded}</p>
              )}
              <button
                type="button"
                onClick={resetGame}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                Play again
              </button>
            </div>
          )}

          {!won && (
            <button
              type="button"
              onClick={resetGame}
              className="mt-6 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"
            >
              Shuffle &amp; restart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
