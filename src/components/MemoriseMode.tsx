'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components';
import { getReciter } from '@/data/quran-reciters';

type Ayah = {
  numberInSurah: number;
  arabic: string;
  english: string;
  audio?: string;
};

type Props = {
  surahNumber: number;
  surahName: string;
  ayahs: Ayah[];
  reciterId: string;
};

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: Array<{ id: Difficulty; label: string; note: string }> = [
  { id: 'easy', label: 'Easy', note: 'hide ~25%' },
  { id: 'medium', label: 'Medium', note: 'hide ~50%' },
  { id: 'hard', label: 'Hard', note: 'hide ~80%' },
];

/** Deterministic word-hiding pattern, seeded by the ayah number so it never reshuffles. */
function isHiddenIndex(index: number, ayahNumber: number, difficulty: Difficulty): boolean {
  const seed = ayahNumber;
  if (difficulty === 'easy') return (index + seed) % 4 === 0;
  if (difficulty === 'medium') return (index + seed) % 2 === 0;
  return (index + seed) % 5 !== 0; // hard: hide 4 of every 5 words (~80%)
}

export function MemoriseMode({ surahNumber, surahName, ayahs, reciterId }: Props) {
  const [index, setIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = ayahs[index];
  const words = useMemo(
    () => (current?.arabic ?? '').split(/\s+/).filter(Boolean),
    [current?.arabic]
  );

  const hidden = useMemo(() => {
    const set = new Set<number>();
    if (!current) return set;
    words.forEach((_, i) => {
      if (isHiddenIndex(i, current.numberInSurah, difficulty)) set.add(i);
    });
    return set;
  }, [words, current, difficulty]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const resetPractice = () => {
    setRevealed(new Set());
    setRevealAll(false);
    setShowMeaning(false);
  };

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(ayahs.length - 1, next));
    if (clamped === index) return;
    stop();
    resetPractice();
    setIndex(clamped);
  };

  const changeDifficulty = (next: Difficulty) => {
    if (next === difficulty) return;
    stop();
    resetPractice();
    setDifficulty(next);
  };

  const toggleWord = (i: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const togglePlay = () => {
    if (playing) {
      stop();
      return;
    }
    const src = current?.audio;
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioRef.current = audio;
    setPlaying(true);
    audio.onended = () => {
      if (audioRef.current === audio) stop();
    };
    audio.onerror = () => {
      if (audioRef.current === audio) stop();
    };
    void audio.play().catch(() => stop());
  };

  if (!ayahs.length || !current) return null;

  const reciterName = getReciter(reciterId)?.name;
  const isLast = index >= ayahs.length - 1;
  const allHiddenRevealed =
    hidden.size > 0 && Array.from(hidden).every((i) => revealed.has(i));

  return (
    <div className="surface-card rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 to-white p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-teal-900 sm:text-lg">🧠 Memorise Mode</h3>
          <p className="mt-1 text-sm text-sand-600">
            Recite from memory — tap a hidden word to peek.
            {reciterName ? ` Listen with ${reciterName}.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => changeDifficulty(d.id)}
              aria-pressed={difficulty === d.id}
              className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                difficulty === d.id
                  ? 'border-teal-400 bg-teal-500 text-white'
                  : 'border-teal-200 bg-white text-teal-800 hover:bg-teal-50'
              }`}
            >
              {d.label}
              <span className="ml-1 font-normal opacity-70">({d.note})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-violet-200/80 bg-white p-4 sm:p-6">
        <div
          dir="rtl"
          className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 font-arabic text-2xl leading-loose text-violet-900 sm:text-3xl"
        >
          {words.map((word, i) => {
            const isHidden = hidden.has(i) && !revealAll && !revealed.has(i);
            if (!isHidden) {
              return (
                <span key={i} className="break-words">
                  {word}
                </span>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleWord(i)}
                aria-label={`Reveal word ${i + 1}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-violet-300 bg-violet-100 px-2 text-transparent transition active:bg-violet-200"
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowMeaning((v) => !v)}
          className="min-h-11 gap-2"
        >
          {showMeaning ? <EyeOff size={16} /> : <Eye size={16} />}
          {showMeaning ? 'Hide meaning' : 'Show meaning'}
        </Button>
        {showMeaning && (
          <p className="mt-2 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 p-3 text-sm leading-relaxed text-sand-800 sm:text-base">
            {current.english}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-sand-200 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
            className="min-h-11 gap-1"
          >
            <ChevronLeft size={16} /> Prev
          </Button>
          <span className="text-sm font-bold text-teal-800">
            Ayah {index + 1} of {ayahs.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            className="min-h-11 gap-1"
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="sm"
            variant={playing ? 'primary' : 'secondary'}
            onClick={togglePlay}
            disabled={!current.audio}
            className="min-h-11 w-full gap-2 sm:w-auto"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? 'Stop' : 'Listen'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRevealAll((v) => !v)}
            className="min-h-11 w-full gap-2 sm:w-auto"
          >
            <RotateCcw size={16} /> {revealAll ? 'Hide all' : 'Reveal all'}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-center text-sm font-bold text-teal-700">
        {allHiddenRevealed
          ? '✨ Amazing — you revealed every word!'
          : isLast
            ? '🎉 MashaAllah! You reached the last ayah — keep it up!'
            : '🌟 You can do it — one word at a time!'}
      </p>
    </div>
  );
}
