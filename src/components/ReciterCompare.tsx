'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { getReciter, QURAN_RECITERS } from '@/data/quran-reciters';

type Props = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  english: string;
  primaryReciterId: string;
  primaryAudio?: string;
};

type ColumnId = 'primary' | 'second';

export function ReciterCompare({
  surahNumber,
  surahName,
  ayahNumber,
  arabic,
  english,
  primaryReciterId,
  primaryAudio,
}: Props) {
  const primary = getReciter(primaryReciterId);
  const otherReciters = useMemo(
    () => QURAN_RECITERS.filter((r) => r.id !== primaryReciterId),
    [primaryReciterId]
  );

  const [secondReciterId, setSecondReciterId] = useState(() => otherReciters[0]?.id ?? '');
  const second = getReciter(secondReciterId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Record<string, string>>({});
  const [secondAudio, setSecondAudio] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [playing, setPlaying] = useState<ColumnId | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Keep the chosen second reciter valid if the primary reciter changes.
  useEffect(() => {
    if (!otherReciters.some((r) => r.id === secondReciterId)) {
      setSecondReciterId(otherReciters[0]?.id ?? '');
    }
  }, [otherReciters, secondReciterId]);

  // Only one voice plays at a time — stop whenever the ayah or second reciter changes.
  useEffect(() => {
    stop();
  }, [ayahNumber, surahNumber, secondReciterId, stop]);

  // Lazily fetch the second reciter's audio for THIS ayah only.
  useEffect(() => {
    if (!secondReciterId) return;
    const key = `${secondReciterId}|${surahNumber}|${ayahNumber}`;
    const cache = cacheRef.current;
    if (key in cache) {
      const cachedUrl = cache[key];
      setSecondAudio(cachedUrl || null);
      setUnavailable(!cachedUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    setSecondAudio(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/quran/juz-amma/${surahNumber}?reciter=${encodeURIComponent(secondReciterId)}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load reciter');
        const match = (json.ayahs as Array<{ numberInSurah: number; audio?: string }> | undefined)?.find(
          (a) => a.numberInSurah === ayahNumber
        );
        const url = match?.audio || '';
        if (cancelled) return;
        cache[key] = url;
        setSecondAudio(url || null);
        setUnavailable(!url);
      } catch {
        if (!cancelled) {
          setSecondAudio(null);
          setUnavailable(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [secondReciterId, surahNumber, ayahNumber]);

  const toggle = useCallback(
    (column: ColumnId, src?: string | null) => {
      if (!src) return;
      if (playing === column) {
        stop();
        return;
      }
      stop();
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioRef.current = audio;
      setPlaying(column);
      audio.onended = () => {
        if (audioRef.current === audio) stop();
      };
      audio.onerror = () => {
        if (audioRef.current === audio) stop();
      };
      void audio.play().catch(() => stop());
    },
    [playing, stop]
  );

  return (
    <div className="surface-card rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white p-4 sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-bold text-violet-900 sm:text-lg">
        <Volume2 size={18} className="shrink-0 text-violet-600" />
        Two voices, one ayah
      </h3>
      <p className="mt-1 text-sm text-sand-600">
        Listen to the same ayah in two voices and notice the difference. 🎧
      </p>

      <div className="mt-3 rounded-2xl border border-violet-200/70 bg-white/70 p-3" dir="rtl">
        <p className="font-arabic text-xl leading-loose text-violet-900 sm:text-2xl">{arabic}</p>
        <p dir="ltr" className="mt-1 text-left text-xs leading-relaxed text-sand-600 sm:text-sm">
          {english}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {/* Column A — the primary reciter */}
        <div className="flex flex-col rounded-2xl border border-violet-200 bg-white/80 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-500">Voice A</p>
          <p className="mt-1 font-bold text-sand-900">{primary?.name ?? 'Current reciter'}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-sand-500">
            {primary ? `${primary.arabicName} — ${primary.description}` : 'Your selected reciter'}
          </p>

          <Button
            size="sm"
            variant={playing === 'primary' ? 'primary' : 'outline'}
            disabled={!primaryAudio}
            onClick={() => toggle('primary', primaryAudio)}
            className="mt-3 min-h-11 w-full gap-2"
          >
            {playing === 'primary' ? <Pause size={16} /> : <Play size={16} />}
            {playing === 'primary' ? 'Stop' : 'Play'}
          </Button>

          {playing === 'primary' && (
            <p className="mt-2 text-center text-xs font-bold text-violet-700">🔊 Playing…</p>
          )}
          {!primaryAudio && (
            <p className="mt-2 text-center text-xs text-amber-700">
              No audio available for this voice yet.
            </p>
          )}
        </div>

        {/* Column B — a second reciter to compare */}
        <div className="flex flex-col rounded-2xl border border-teal-200 bg-white/80 p-3 sm:p-4">
          <label
            htmlFor="compare-reciter-select"
            className="text-xs font-bold uppercase tracking-wide text-teal-600"
          >
            Voice B
          </label>
          <select
            id="compare-reciter-select"
            value={secondReciterId}
            onChange={(e) => setSecondReciterId(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-sand-900 outline-none ring-teal-200 focus:ring-2"
          >
            {otherReciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-xs leading-relaxed text-sand-500">
            {second ? `${second.arabicName} — ${second.description}` : ''}
          </p>

          <Button
            size="sm"
            variant={playing === 'second' ? 'primary' : 'outline'}
            disabled={!secondAudio || loading}
            onClick={() => toggle('second', secondAudio)}
            className="mt-3 min-h-11 w-full gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : playing === 'second' ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
            {playing === 'second' ? 'Stop' : 'Play'}
          </Button>

          {loading && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-sand-500">
              <Loader2 size={12} className="animate-spin" /> Loading audio…
            </p>
          )}
          {!loading && unavailable && (
            <p className="mt-2 text-center text-xs text-amber-700">
              Audio unavailable — try another voice.
            </p>
          )}
          {playing === 'second' && (
            <p className="mt-2 text-center text-xs font-bold text-teal-700">🔊 Playing…</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-sand-500">
        Surah {surahNumber}: {surahName} · Ayah {ayahNumber}
      </p>
    </div>
  );
}
