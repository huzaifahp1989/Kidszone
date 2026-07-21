'use client';

import React from 'react';
import { Loader2, Pause, Play, Repeat, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { QURAN_RECITERS } from '@/data/quran-reciters';
import type { QuranRepeatMode, QuranRepeatRange } from '@/lib/use-quran-audio';

type Props = {
  surahNumber: number;
  surahName: string;
  ayahCount: number;
  reciterId: string;
  onReciterChange: (id: string) => void;
  playingAyah: number | null;
  isPlayingAll: boolean;
  repeatMode: QuranRepeatMode;
  repeatRange: QuranRepeatRange;
  hasAudio: boolean;
  loadingAudio?: boolean;
  audioError?: string | null;
  onPlayFull: () => void;
  onPlayRange: () => void;
  onSkip: (delta: number) => void;
  onRepeatModeChange: (mode: QuranRepeatMode) => void;
  onRepeatRangeChange: (range: QuranRepeatRange) => void;
};

const REPEAT_LABELS: Record<QuranRepeatMode, string> = {
  off: 'No repeat',
  ayah: 'Repeat ayah',
  range: 'Repeat range',
  surah: 'Repeat surah',
};

export function QuranReciterPanel({
  surahNumber,
  surahName,
  ayahCount,
  reciterId,
  onReciterChange,
  playingAyah,
  isPlayingAll,
  repeatMode,
  repeatRange,
  hasAudio,
  loadingAudio = false,
  audioError = null,
  onPlayFull,
  onPlayRange,
  onSkip,
  onRepeatModeChange,
  onRepeatRangeChange,
}: Props) {
  const selected = QURAN_RECITERS.find((r) => r.id === reciterId) ?? QURAN_RECITERS[0];
  const ayahOptions = Array.from({ length: Math.max(1, ayahCount) }, (_, index) => index + 1);
  const playLabel = repeatMode === 'range' ? 'Play range' : 'Play full surah';
  const repeatHelp =
    repeatMode === 'ayah'
      ? 'Tap any ayah below and it will repeat until you stop it.'
      : repeatMode === 'range'
        ? `Ayahs ${repeatRange.start}-${repeatRange.end} will loop for memorisation practice.`
        : repeatMode === 'surah'
          ? 'The full surah will restart automatically at the end.'
          : 'Audio plays once and stops at the end.';

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
          onClick={repeatMode === 'range' ? onPlayRange : onPlayFull}
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
          {isPlayingAll ? 'Stop' : playLabel}
        </Button>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSkip(-1)}
            disabled={!playingAyah}
            className="min-h-11 flex-1 sm:flex-none"
            aria-label="Skip to previous ayah"
          >
            <SkipBack size={16} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSkip(1)}
            disabled={!playingAyah}
            className="min-h-11 flex-1 sm:flex-none"
            aria-label="Skip to next ayah"
          >
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

      <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-900">
          <Repeat size={16} className="text-violet-600" />
          Repeat practice
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label htmlFor="repeat-mode-select" className="mb-1 block text-xs font-bold uppercase tracking-wide text-violet-700">
              Repeat mode
            </label>
            <select
              id="repeat-mode-select"
              value={repeatMode}
              onChange={(event) => onRepeatModeChange(event.target.value as QuranRepeatMode)}
              className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-sand-900 outline-none ring-violet-200 focus:ring-2"
            >
              {(Object.keys(REPEAT_LABELS) as QuranRepeatMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {REPEAT_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>

          {repeatMode === 'range' && (
            <>
              <div>
                <label htmlFor="repeat-range-start" className="mb-1 block text-xs font-bold uppercase tracking-wide text-violet-700">
                  From
                </label>
                <select
                  id="repeat-range-start"
                  value={repeatRange.start}
                  onChange={(event) => onRepeatRangeChange({ ...repeatRange, start: Number(event.target.value) })}
                  className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-sand-900 outline-none ring-violet-200 focus:ring-2"
                >
                  {ayahOptions.map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="repeat-range-end" className="mb-1 block text-xs font-bold uppercase tracking-wide text-violet-700">
                  To
                </label>
                <select
                  id="repeat-range-end"
                  value={repeatRange.end}
                  onChange={(event) => onRepeatRangeChange({ ...repeatRange, end: Number(event.target.value) })}
                  className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-sand-900 outline-none ring-violet-200 focus:ring-2"
                >
                  {ayahOptions.map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sand-500">{repeatHelp}</p>
      </div>

      {audioError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{audioError}</p>
      )}
    </div>
  );
}
