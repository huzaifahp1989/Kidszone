'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackRadioStarted } from '@/lib/analytics';

export type AyahWithAudio = {
  numberInSurah: number;
  arabic: string;
  english: string;
  audio?: string;
};

export type QuranRepeatMode = 'off' | 'ayah' | 'range' | 'surah';

export type QuranRepeatRange = {
  start: number;
  end: number;
};

type PlaybackSequenceArgs = {
  currentIndex: number;
  listLength: number;
  repeatMode: QuranRepeatMode;
  repeatRange?: QuranRepeatRange | null;
};

type PlaybackSkipArgs = PlaybackSequenceArgs & {
  delta: number;
  sequential: boolean;
};

export function normalizeQuranRepeatRange(range: QuranRepeatRange, listLength: number): QuranRepeatRange {
  const max = Math.max(1, listLength);
  const start = Math.min(Math.max(1, Math.trunc(range.start)), max);
  const end = Math.min(Math.max(1, Math.trunc(range.end)), max);

  return start <= end ? { start, end } : { start: end, end: start };
}

export function getNextQuranPlaybackIndex({
  currentIndex,
  listLength,
  repeatMode,
  repeatRange,
}: PlaybackSequenceArgs): number | null {
  if (listLength <= 0 || currentIndex < 0 || currentIndex >= listLength) return null;

  if (repeatMode === 'ayah') return currentIndex;

  if (repeatMode === 'range' && repeatRange) {
    const range = normalizeQuranRepeatRange(repeatRange, listLength);
    const startIndex = range.start - 1;
    const endIndex = range.end - 1;

    if (currentIndex < startIndex || currentIndex > endIndex) return startIndex;
    return currentIndex < endIndex ? currentIndex + 1 : startIndex;
  }

  if (currentIndex + 1 < listLength) return currentIndex + 1;
  return repeatMode === 'surah' ? 0 : null;
}

export function getSkippedQuranPlaybackIndex({
  currentIndex,
  listLength,
  repeatMode,
  repeatRange,
  delta,
  sequential,
}: PlaybackSkipArgs): number | null {
  if (listLength <= 0 || currentIndex < 0 || currentIndex >= listLength || delta === 0) return null;

  if (sequential && repeatMode === 'range' && repeatRange) {
    const range = normalizeQuranRepeatRange(repeatRange, listLength);
    const startIndex = range.start - 1;
    const endIndex = range.end - 1;
    const rangeLength = endIndex - startIndex + 1;
    const currentWithinRange = currentIndex >= startIndex && currentIndex <= endIndex ? currentIndex : startIndex;
    const offset = (currentWithinRange - startIndex + delta) % rangeLength;
    return startIndex + (offset + rangeLength) % rangeLength;
  }

  if (sequential && repeatMode === 'surah') {
    const offset = (currentIndex + delta) % listLength;
    return (offset + listLength) % listLength;
  }

  const next = currentIndex + delta;
  return next >= 0 && next < listLength ? next : null;
}

export function useQuranPlayback(ayahs: AyahWithAudio[]) {
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [repeatMode, setRepeatModeState] = useState<QuranRepeatMode>('off');
  const [repeatRange, setRepeatRangeState] = useState<QuranRepeatRange>({ start: 1, end: 1 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingAllRef = useRef(false);
  const ayahsRef = useRef(ayahs);
  const radioTrackedRef = useRef(false);
  const repeatModeRef = useRef<QuranRepeatMode>('off');
  const repeatRangeRef = useRef<QuranRepeatRange>(repeatRange);
  const initializedRangeRef = useRef(false);
  const playFromIndexRef = useRef<(index: number, sequential: boolean, attempts?: number) => void>(() => undefined);

  useEffect(() => {
    ayahsRef.current = ayahs;
    if (ayahs.length === 0) return;

    setRepeatRangeState((current) => {
      if (!initializedRangeRef.current) {
        initializedRangeRef.current = true;
        return { start: 1, end: ayahs.length };
      }
      return normalizeQuranRepeatRange(current, ayahs.length);
    });
  }, [ayahs]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    repeatRangeRef.current = repeatRange;
  }, [repeatRange]);

  const stopAudio = useCallback(() => {
    playingAllRef.current = false;
    radioTrackedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingAyah(null);
    setIsPlayingAll(false);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const playFromIndex = useCallback(
    (index: number, sequential: boolean, attempts = 0) => {
      const list = ayahsRef.current;
      const ayah = list[index];
      if (!ayah?.audio) {
        const nextIndex = sequential
          ? getNextQuranPlaybackIndex({
              currentIndex: index,
              listLength: list.length,
              repeatMode: repeatModeRef.current,
              repeatRange: repeatRangeRef.current,
            })
          : null;

        if (nextIndex !== null && nextIndex !== index && attempts + 1 < list.length) {
          playFromIndexRef.current(nextIndex, true, attempts + 1);
        } else {
          stopAudio();
          if (!list.some((a) => a.audio)) {
            setAudioError('No audio available. Try another reciter.');
          } else if (repeatModeRef.current === 'range') {
            setAudioError('No audio available in this repeat range. Choose a different range or reciter.');
          }
        }
        return;
      }

      setAudioError(null);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = ayah.audio;
      audioRef.current = audio;
      setPlayingAyah(ayah.numberInSurah);
      playingAllRef.current = sequential;
      setIsPlayingAll(sequential);

      if (sequential && !radioTrackedRef.current) {
        radioTrackedRef.current = true;
        trackRadioStarted({ source: 'quran_play_all' });
      }

      audio.onended = () => {
        const mode = repeatModeRef.current;
        if (!sequential && mode !== 'ayah') {
          stopAudio();
          return;
        }

        const nextIndex = getNextQuranPlaybackIndex({
          currentIndex: index,
          listLength: list.length,
          repeatMode: mode,
          repeatRange: repeatRangeRef.current,
        });

        if (nextIndex !== null) {
          playFromIndexRef.current(nextIndex, sequential);
        } else {
          stopAudio();
        }
      };
      audio.onerror = () => {
        setAudioError('Could not play audio. Check your connection and try again.');
        stopAudio();
      };
      void audio.play().catch(() => {
        setAudioError('Tap play again — your browser may have blocked autoplay.');
        stopAudio();
      });
    },
    [stopAudio]
  );

  useEffect(() => {
    playFromIndexRef.current = playFromIndex;
  }, [playFromIndex]);

  const setRepeatMode = useCallback((mode: QuranRepeatMode) => {
    setRepeatModeState(mode);
  }, []);

  const setRepeatRange = useCallback((range: QuranRepeatRange) => {
    setRepeatRangeState(normalizeQuranRepeatRange(range, ayahsRef.current.length));
  }, []);

  const playAyah = useCallback(
    (numberInSurah: number) => {
      const list = ayahsRef.current;
      const index = list.findIndex((a) => a.numberInSurah === numberInSurah);
      if (index >= 0) playFromIndex(index, false);
    },
    [playFromIndex]
  );

  const playFullSurah = useCallback(() => {
    if (isPlayingAll) {
      stopAudio();
      return;
    }
    const list = ayahsRef.current;
    const first = list.findIndex((a) => a.audio);
    if (first >= 0) playFromIndex(first, true);
    else setAudioError('No audio available. Try another reciter.');
  }, [isPlayingAll, playFromIndex, stopAudio]);

  const playRepeatRange = useCallback(() => {
    if (isPlayingAll) {
      stopAudio();
      return;
    }

    const list = ayahsRef.current;
    const range = normalizeQuranRepeatRange(repeatRangeRef.current, list.length);
    const startIndex = range.start - 1;
    const endIndex = range.end - 1;
    const firstPlayable = list.findIndex((ayah, index) => index >= startIndex && index <= endIndex && Boolean(ayah.audio));

    if (firstPlayable >= 0) {
      playFromIndex(firstPlayable, true);
    } else {
      setAudioError('No audio available in this repeat range. Choose a different range or reciter.');
    }
  }, [isPlayingAll, playFromIndex, stopAudio]);

  const skip = useCallback(
    (delta: number) => {
      if (!playingAyah) return;
      const list = ayahsRef.current;
      const idx = list.findIndex((a) => a.numberInSurah === playingAyah);
      const next = getSkippedQuranPlaybackIndex({
        currentIndex: idx,
        listLength: list.length,
        repeatMode: repeatModeRef.current,
        repeatRange: repeatRangeRef.current,
        delta,
        sequential: playingAllRef.current,
      });
      if (next !== null) {
        playFromIndex(next, playingAllRef.current);
      }
    },
    [playingAyah, playFromIndex]
  );

  return {
    playingAyah,
    isPlayingAll,
    audioError,
    repeatMode,
    repeatRange,
    setRepeatMode,
    setRepeatRange,
    playAyah,
    playFullSurah,
    playRepeatRange,
    skip,
    stopAudio,
  };
}
