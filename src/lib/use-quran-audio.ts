'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackRadioStarted } from '@/lib/analytics';

export type AyahWithAudio = {
  numberInSurah: number;
  arabic: string;
  english: string;
  audio?: string;
};

export function useQuranPlayback(ayahs: AyahWithAudio[]) {
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingAllRef = useRef(false);
  const ayahsRef = useRef(ayahs);
  const radioTrackedRef = useRef(false);

  useEffect(() => {
    ayahsRef.current = ayahs;
  }, [ayahs]);

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
    (index: number, sequential: boolean) => {
      const list = ayahsRef.current;
      const ayah = list[index];
      if (!ayah?.audio) {
        if (sequential && index + 1 < list.length) {
          playFromIndex(index + 1, true);
        } else {
          stopAudio();
          if (!list.some((a) => a.audio)) {
            setAudioError('No audio available. Try another reciter.');
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
        if (sequential && index + 1 < list.length) {
          playFromIndex(index + 1, true);
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

  const skip = useCallback(
    (delta: number) => {
      if (!playingAyah) return;
      const list = ayahsRef.current;
      const idx = list.findIndex((a) => a.numberInSurah === playingAyah);
      const next = idx + delta;
      if (next >= 0 && next < list.length) {
        playFromIndex(next, playingAllRef.current);
      }
    },
    [playingAyah, playFromIndex]
  );

  return { playingAyah, isPlayingAll, audioError, playAyah, playFullSurah, skip, stopAudio };
}
