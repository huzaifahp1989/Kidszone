'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ALLAH_NAMES_KIDS } from '@/data/kids-new-activities';
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

export default function NamesFlashcardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<'menu' | 'flash' | 'match' | 'done'>('menu');
  const [flashIndex, setFlashIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [matchLeft, setMatchLeft] = useState<string[]>([]);
  const [matchRight, setMatchRight] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [paired, setPaired] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const claimed = useRef(false);

  const deck = useMemo(() => shuffle(ALLAH_NAMES_KIDS).slice(0, 8), []);

  const awardOnce = async () => {
    if (!user?.id || claimed.current) return;
    claimed.current = true;
    const result = await completeGameSession({
      userId: user.id,
      gameId: 'names-flashcards',
      gameTitle: '99 Names Flashcards',
      trackCompetition: true,
    });
    setMessage(
      result.pointsAwarded > 0
        ? `⭐ +${result.pointsAwarded} points!`
        : result.message || 'Great job learning the names of Allah!'
    );
  };

  const startFlash = () => {
    claimed.current = false;
    setMessage(null);
    setFlashIndex(0);
    setShowMeaning(false);
    setMode('flash');
  };

  const startMatch = () => {
    claimed.current = false;
    setMessage(null);
    setPaired(new Set());
    setSelectedLeft(null);
    setMatchLeft(shuffle(deck.map((n) => n.id)));
    setMatchRight(shuffle(deck.map((n) => n.id)));
    setMode('match');
  };

  const finishFlash = async () => {
    setMode('done');
    await awardOnce();
  };

  const onPickLeft = (id: string) => {
    if (paired.has(id)) return;
    setSelectedLeft(id);
  };

  const onPickRight = async (id: string) => {
    if (!selectedLeft || paired.has(id)) return;
    if (selectedLeft === id) {
      const next = new Set(paired);
      next.add(id);
      setPaired(next);
      setSelectedLeft(null);
      if (next.size === deck.length) {
        setMode('done');
        await awardOnce();
      }
    } else {
      setSelectedLeft(null);
    }
  };

  const nameById = (id: string) => deck.find((n) => n.id === id)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 pb-20">
      <button
        type="button"
        onClick={() => router.push('/games')}
        className="mb-4 flex items-center gap-2 font-bold text-blue-900"
      >
        <ArrowLeft size={18} /> Games
      </button>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-blue-900">☪️ Names of Allah</h1>
        <p className="text-sm text-gray-500">Learn beautiful names with flashcards or matching</p>
      </div>

      {mode === 'menu' && (
        <div className="mx-auto max-w-sm space-y-3 rounded-3xl border border-blue-100 bg-white p-6 shadow-lg">
          <p className="text-center text-sm text-sand-600">
            Finish a round for up to +{ACTIVITY_BONUS_POINTS} game points (daily game limit applies).
          </p>
          <button
            type="button"
            onClick={startFlash}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 py-4 text-lg font-black text-white"
          >
            📇 Flashcards
          </button>
          <button
            type="button"
            onClick={startMatch}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-700 py-4 text-lg font-black text-white"
          >
            🧩 Match names & meanings
          </button>
        </div>
      )}

      {mode === 'flash' && (
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-center text-sm font-semibold text-blue-800">
            Card {flashIndex + 1} / {deck.length}
          </p>
          <button
            type="button"
            onClick={() => setShowMeaning((v) => !v)}
            className="w-full rounded-3xl border-2 border-blue-200 bg-white p-8 text-center shadow-md"
          >
            <p className="font-arabic text-4xl text-blue-950">{deck[flashIndex].arabic}</p>
            <p className="mt-3 text-xl font-extrabold text-sand-900">{deck[flashIndex].transliteration}</p>
            {showMeaning ? (
              <p className="mt-4 text-lg font-bold text-teal-800">{deck[flashIndex].meaning}</p>
            ) : (
              <p className="mt-4 text-sm text-sand-500">Tap to show meaning</p>
            )}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={flashIndex === 0}
              onClick={() => {
                setFlashIndex((i) => Math.max(0, i - 1));
                setShowMeaning(false);
              }}
              className="flex-1 rounded-2xl border border-sand-200 py-3 font-bold disabled:opacity-40"
            >
              Back
            </button>
            {flashIndex < deck.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setFlashIndex((i) => i + 1);
                  setShowMeaning(false);
                }}
                className="flex-1 rounded-2xl bg-blue-600 py-3 font-bold text-white"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishFlash()}
                className="flex-1 rounded-2xl bg-teal-600 py-3 font-bold text-white"
              >
                Finish ✓
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'match' && (
        <div className="mx-auto max-w-lg space-y-4">
          <p className="text-center text-sm font-semibold text-indigo-800">
            Match each name to its meaning ({paired.size}/{deck.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {matchLeft.map((id) => (
                <button
                  key={`L-${id}`}
                  type="button"
                  disabled={paired.has(id)}
                  onClick={() => onPickLeft(id)}
                  className={`w-full rounded-xl border-2 px-3 py-3 text-left text-sm font-bold disabled:opacity-40 ${
                    selectedLeft === id
                      ? 'border-blue-500 bg-blue-50'
                      : paired.has(id)
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-sand-200 bg-white'
                  }`}
                >
                  {nameById(id).transliteration}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {matchRight.map((id) => (
                <button
                  key={`R-${id}`}
                  type="button"
                  disabled={paired.has(id)}
                  onClick={() => void onPickRight(id)}
                  className={`w-full rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold disabled:opacity-40 ${
                    paired.has(id) ? 'border-emerald-300 bg-emerald-50' : 'border-sand-200 bg-white'
                  }`}
                >
                  {nameById(id).meaning}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'done' && (
        <div className="mx-auto max-w-sm rounded-3xl border border-green-100 bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-6xl">🌟</div>
          <h2 className="mb-2 text-2xl font-black text-green-700">MashaAllah!</h2>
          <p className="mb-4 text-sand-600">{message || 'You finished today’s Names practice.'}</p>
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
