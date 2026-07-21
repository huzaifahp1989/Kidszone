'use client';

import React, { useState } from 'react';
import { Loader2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { QURAN_RECITERS } from '@/data/quran-reciters';

type Props = {
  surahNumber: number;
  surahName: string;
  reciterId: string;
  onReciterChange: (id: string) => void;
  playingAyah: number | null;
  isPlayingAll: boolean;
  hasAudio: boolean;
  loadingAudio?: boolean;
  audioError?: string | null;
  onPlayFull: () => void;
  onSkip: (delta: number) => void;
};

export function QuranReciterPanel({
  surahNumber,
  surahName,
  reciterId,
  onReciterChange,
  playingAyah,
  isPlayingAll,
  hasAudio,
  loadingAudio = false,
  audioError = null,
  onPlayFull,
  onSkip,
}: Props) {
  const selected = QURAN_RECITERS.find((r) => r.id === reciterId) ?? QURAN_RECITERS[0];

  return (
    <div className="surface-card rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-violet-900 sm:text-lg">
            <Volume2 size={20} className="shrink-0 text-violet-600" />
            Listen with a reciter
          </h2>
          <p className="mt-1 text-sm text-sand-600">
            Surah {surahNumber}: {surahName}
          </p>
        </div>

        <div className="w-full">
          <label htmlFor="reciter-select" className="mb-1 block text-xs font-bold uppercase tracking-wide text-violet-700">
            Choose reciter
          </label>
          <select
            id="reciter-select"
            value={reciterId}
            onChange={(e) => onReciterChange(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base font-semibold text-sand-900 outline-none ring-violet-200 focus:ring-2 sm:text-sm"
          >
            {QURAN_RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-sand-500">
            <span className="font-arabic">{selected.arabicName}</span> — {selected.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          size="sm"
          variant="primary"
          onClick={onPlayFull}
          disabled={!hasAudio || loadingAudio}
          className="min-h-11 w-full gap-2 sm:w-auto"
        >
          {loadingAudio ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isPlayingAll ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
          {isPlayingAll ? 'Stop' : 'Play full surah'}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onSkip(-1)} disabled={!playingAyah} className="min-h-11 flex-1 sm:flex-none">
            <SkipBack size={16} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSkip(1)} disabled={!playingAyah} className="min-h-11 flex-1 sm:flex-none">
            <SkipForward size={16} />
          </Button>
        </div>
        {playingAyah && <span className="text-center text-sm font-bold text-violet-700 sm:text-left">Ayah {playingAyah}</span>}
        {loadingAudio && (
          <span className="flex items-center justify-center gap-1 text-sm text-sand-500 sm:justify-start">
            <Loader2 size={14} className="animate-spin" /> Loading audio…
          </span>
        )}
        {!loadingAudio && !hasAudio && (
          <span className="text-center text-sm text-amber-700 sm:text-left">Audio unavailable — try another reciter.</span>
        )}
      </div>
      {audioError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{audioError}</p>
      )}
    </div>
  );
}
