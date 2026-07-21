'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Play, Volume2 } from 'lucide-react';
import { Button, Modal } from '@/components';
import { AyahHoverTooltip } from '@/components/AyahHoverTooltip';
import { QuranReciterPanel } from '@/components/QuranReciterPanel';
import { SurahRecorder } from '@/components/SurahRecorder';
import { TajweedAyahText } from '@/components/TajweedAyahText';
import { TajweedGuide } from '@/components/TajweedGuide';
import type { JuzAmmaSurahMeta } from '@/data/juz-amma';
import { getJuzAmmaSurah, JUZ_AMMA_SURAH_LIST } from '@/data/juz-amma';
import { DEFAULT_RECITER_ID } from '@/data/quran-reciters';
import { useQuranPlayback } from '@/lib/use-quran-audio';
import { useIsMobile } from '@/lib/use-media-query';

type Ayah = {
  number: number;
  numberInSurah: number;
  arabic: string;
  arabicTajweed?: string;
  english: string;
  audio?: string;
};

export default function JuzAmmaSurahPage() {
  const params = useParams();
  const surahNumber = Number(params.surahNumber);
  const staticMeta = getJuzAmmaSurah(surahNumber);
  const isMobile = useIsMobile();

  const [meta, setMeta] = useState<JuzAmmaSurahMeta | null>(staticMeta || null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [reciterId, setReciterId] = useState(DEFAULT_RECITER_ID);
  const [loading, setLoading] = useState(true);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);

  useEffect(() => {
    setShowFullText(!isMobile);
  }, [isMobile]);

  const { playingAyah, isPlayingAll, audioError, playAyah, playFullSurah, skip, stopAudio } = useQuranPlayback(ayahs);
  const hasAudio = ayahs.some((a) => a.audio);

  const nav = useMemo(() => {
    const idx = JUZ_AMMA_SURAH_LIST.findIndex((s) => s.number === surahNumber);
    return {
      prev: idx > 0 ? JUZ_AMMA_SURAH_LIST[idx - 1] : null,
      next: idx >= 0 && idx < JUZ_AMMA_SURAH_LIST.length - 1 ? JUZ_AMMA_SURAH_LIST[idx + 1] : null,
    };
  }, [surahNumber]);

  const loadSurah = useCallback(
    async (reciter: string, initial = false) => {
      if (!staticMeta) {
        setError('Surah not found in Juz Amma.');
        setLoading(false);
        return;
      }
      if (initial) setLoading(true);
      else setLoadingAudio(true);
      setError(null);
      try {
        const res = await fetch(`/api/quran/juz-amma/${surahNumber}?reciter=${encodeURIComponent(reciter)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load surah');
        setMeta(json.meta);
        setAyahs(json.ayahs || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setMeta(staticMeta);
        if (initial) setAyahs([]);
      } finally {
        setLoading(false);
        setLoadingAudio(false);
      }
    },
    [surahNumber, staticMeta]
  );

  useEffect(() => {
    const saved = localStorage.getItem('kids-zone-quran-reciter');
    const reciter = saved || DEFAULT_RECITER_ID;
    setReciterId(reciter);
    loadSurah(reciter, true);
  }, [loadSurah]);

  const handleReciterChange = (id: string) => {
    stopAudio();
    setSelectedAyah(null);
    setReciterId(id);
    localStorage.setItem('kids-zone-quran-reciter', id);
    loadSurah(id, false);
  };

  const openAyah = useCallback(
    (ayah: Ayah) => {
      setSelectedAyah(ayah);
      playAyah(ayah.numberInSurah);
    },
    [playAyah]
  );

  const closeAyahModal = () => {
    setSelectedAyah(null);
    stopAudio();
  };

  const goToAyah = (delta: number) => {
    if (!selectedAyah) return;
    const idx = ayahs.findIndex((a) => a.numberInSurah === selectedAyah.numberInSurah);
    const next = ayahs[idx + delta];
    if (next) openAyah(next);
  };

  const selectedIndex = selectedAyah ? ayahs.findIndex((a) => a.numberInSurah === selectedAyah.numberInSurah) : -1;

  if (!staticMeta) {
    return (
      <div className="page-inner mx-auto max-w-3xl text-center">
        <p className="text-sand-600">This surah is not part of Juz Amma (78–114).</p>
        <Link href="/quran/learn" className="mt-4 inline-block font-bold text-violet-700">
          ← Back to Juz Amma
        </Link>
      </div>
    );
  }

  return (
    <div className="page-inner quran-learn-mobile">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/quran/learn"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700 hover:underline sm:mb-6"
        >
          <ArrowLeft size={16} /> All Juz Amma surahs
        </Link>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sand-600">
            <Loader2 className="animate-spin" size={24} />
            Loading surah…
          </div>
        ) : meta ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-800 p-4 text-white shadow-panel sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-200 sm:text-sm">
                Surah {meta.number} · {meta.revelation} · {meta.ayahCount} ayahs
              </p>
              <p className="font-arabic mt-2 text-3xl font-bold sm:text-4xl">{meta.arabicName}</p>
              <h1 className="font-heading mt-2 text-2xl font-bold sm:text-3xl">{meta.englishName}</h1>
              <p className="mt-2 text-sm text-violet-100 sm:text-base">{meta.theme}</p>
            </div>

            <QuranReciterPanel
              surahNumber={meta.number}
              surahName={meta.englishName}
              reciterId={reciterId}
              onReciterChange={handleReciterChange}
              playingAyah={playingAyah}
              isPlayingAll={isPlayingAll}
              hasAudio={hasAudio}
              loadingAudio={loadingAudio}
              audioError={audioError}
              onPlayFull={playFullSurah}
              onSkip={skip}
            />

            <SurahRecorder
              surahNumber={meta.number}
              surahName={meta.englishName}
              arabicName={meta.arabicName}
              ayahCount={meta.ayahCount}
            />

            <div className="surface-card rounded-2xl border-l-4 border-amber-400 bg-amber-50/70 p-4 sm:p-6">
              <h2 className="text-base font-bold text-amber-900 sm:text-lg">📚 Full meaning (for kids)</h2>
              <p className="mt-2 text-sm leading-relaxed text-sand-800 sm:mt-3 sm:text-base">{meta.fullMeaning}</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                <h2 className="section-title mb-0 text-lg sm:text-xl">📜 Full surah text</h2>
                <Button size="sm" variant="outline" onClick={() => setShowFullText((v) => !v)} className="w-full sm:w-auto">
                  {showFullText ? 'Hide full text' : 'Show full text'}
                </Button>
              </div>

              {showFullText && ayahs.length > 0 && (
                <>
                  <div className="surface-card rounded-2xl border-r-4 border-violet-500 bg-gradient-to-br from-violet-50/60 to-white p-3 sm:p-6">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-violet-800 sm:mb-4 sm:text-sm">
                      Arabic — Tajweed colours
                    </h3>
                    <div className="space-y-4" dir="rtl">
                      {ayahs.map((ayah) => (
                        <AyahHoverTooltip
                          key={ayah.numberInSurah}
                          numberInSurah={ayah.numberInSurah}
                          english={ayah.english}
                          className="block w-full"
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={() => openAyah(ayah)}
                            className={`flex min-h-11 w-full items-start gap-2 rounded-xl border border-transparent p-2 text-right transition active:bg-violet-50/70 sm:gap-3 sm:p-3 sm:hover:border-violet-200 sm:hover:bg-violet-50/50 ${
                              selectedAyah?.numberInSurah === ayah.numberInSurah ? 'border-violet-300 bg-violet-50/70' : ''
                            }`}
                          >
                            <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-800">
                              {ayah.numberInSurah}
                            </span>
                            <TajweedAyahText
                              arabic={ayah.arabic}
                              arabicTajweed={ayah.arabicTajweed}
                              size="md"
                              className="flex-1 text-violet-900"
                            />
                          </button>
                        </AyahHoverTooltip>
                      ))}
                    </div>
                  </div>

                  <div className="surface-card rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/40 p-3 sm:p-6">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-800 sm:mb-4 sm:text-sm">
                      English translation
                    </h3>
                    <div className="space-y-2 text-sm leading-relaxed text-sand-800 sm:space-y-3 sm:text-base">
                      {ayahs.map((ayah) => (
                        <button
                          key={ayah.numberInSurah}
                          type="button"
                          onClick={() => openAyah(ayah)}
                          className={`block min-h-11 w-full rounded-xl p-2 text-left transition active:bg-indigo-100/70 sm:hover:bg-indigo-100/60 ${
                            selectedAyah?.numberInSurah === ayah.numberInSurah ? 'bg-indigo-100/80' : ''
                          }`}
                        >
                          <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-xs font-bold text-indigo-800">
                            {ayah.numberInSurah}
                          </span>
                          {ayah.english}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="surface-card rounded-xl border-l-4 border-violet-500 bg-violet-50/60 p-4 sm:p-5">
                <h3 className="font-bold text-violet-800">📌 Main lesson</h3>
                <p className="mt-2 text-sand-800">{meta.mainLesson}</p>
              </div>
              <div className="surface-card rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 p-4 sm:p-5">
                <h3 className="font-bold text-indigo-800">🤔 Did you know?</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-sand-800">
                  {meta.facts.map((fact) => (
                    <li key={fact} className="flex gap-2">
                      <span className="text-indigo-500">▪</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h2 className="section-title text-lg sm:text-xl">📖 Tap any ayah</h2>
              <p className="mb-3 text-sm text-sand-600 sm:mb-4">
                {isMobile
                  ? 'Tap an ayah to hear it and see the English meaning.'
                  : 'Coloured letters show Tajweed rules. Hover for translation, tap to listen.'}
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                Could not load surah online. {error}
              </p>
            )}

            <div className="space-y-3">
              {ayahs.map((ayah) => {
                const isActive = selectedAyah?.numberInSurah === ayah.numberInSurah;
                const isPlaying = playingAyah === ayah.numberInSurah && !isPlayingAll;
                return (
                  <AyahHoverTooltip
                    key={ayah.numberInSurah}
                    numberInSurah={ayah.numberInSurah}
                    english={ayah.english}
                    className="block w-full"
                    placement="top"
                  >
                    <button
                      type="button"
                      onClick={() => openAyah(ayah)}
                      className={`group flex w-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition active:scale-[0.99] sm:flex-row sm:items-stretch sm:gap-0 sm:hover:shadow-md ${
                        isActive
                          ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-white ring-2 ring-violet-300/60'
                          : 'border-sand-200/90 bg-white sm:hover:border-violet-200'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 border-b border-sand-200/80 px-3 py-2 sm:w-14 sm:shrink-0 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:px-2 sm:py-4 ${
                          isPlaying ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wide opacity-80 sm:hidden">Ayah</span>
                        {isPlaying ? (
                          <Volume2 size={18} className="animate-pulse" />
                        ) : (
                          <span className="text-sm font-bold">{ayah.numberInSurah}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 px-3 py-3 sm:px-5 sm:py-5">
                        <TajweedAyahText arabic={ayah.arabic} arabicTajweed={ayah.arabicTajweed} size="lg" />
                        <p className="mt-2 line-clamp-2 text-xs leading-snug text-sand-500 sm:mt-3 sm:line-clamp-none sm:font-semibold sm:uppercase sm:tracking-wide sm:text-sand-400">
                          <span className="sm:hidden">{ayah.english}</span>
                          <span className="hidden sm:inline">Hover = meaning · Tap = listen</span>
                        </p>
                      </div>
                    </button>
                  </AyahHoverTooltip>
                );
              })}
            </div>

            <TajweedGuide />

            <Modal
              isOpen={!!selectedAyah}
              onClose={closeAyahModal}
              title={selectedAyah ? `Ayah ${selectedAyah.numberInSurah}` : ''}
              size="lg"
            >
              {selectedAyah && meta && (
                <div className="space-y-5">
                  <p className="text-sm font-bold text-violet-700">
                    Surah {meta.number}: {meta.englishName}
                  </p>

                  <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white p-4 sm:p-6">
                    <TajweedAyahText
                      arabic={selectedAyah.arabic}
                      arabicTajweed={selectedAyah.arabicTajweed}
                      size="xl"
                    />
                  </div>

                  <div className="rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/50 p-4 sm:p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-800">
                      English translation
                    </p>
                    <p className="text-base leading-relaxed text-sand-800 sm:text-lg">{selectedAyah.english}</p>
                  </div>

                  {selectedAyah.audio && (
                    <div className="flex items-center gap-2 text-sm text-violet-700">
                      <Volume2 size={16} className={playingAyah === selectedAyah.numberInSurah ? 'animate-pulse' : ''} />
                      {playingAyah === selectedAyah.numberInSurah
                        ? 'Playing this ayah…'
                        : 'Audio finished — tap replay to listen again'}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 border-t border-sand-200 pt-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goToAyah(-1)}
                      disabled={selectedIndex <= 0}
                      className="min-h-11 gap-1 px-2 text-xs sm:px-4 sm:text-sm"
                    >
                      <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
                    </Button>

                    {selectedAyah.audio && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => playAyah(selectedAyah.numberInSurah)}
                        className="min-h-11 gap-1 px-2 text-xs sm:gap-2 sm:px-4 sm:text-sm"
                      >
                        <Play size={16} /> Replay
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goToAyah(1)}
                      disabled={selectedIndex < 0 || selectedIndex >= ayahs.length - 1}
                      className="min-h-11 gap-1 px-2 text-xs sm:px-4 sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

            <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 sm:flex-row sm:flex-wrap sm:gap-3 sm:pt-6">
              {nav.prev && (
                <Link
                  href={`/quran/learn/${nav.prev.number}`}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-bold text-sand-800 active:bg-violet-50 sm:justify-start sm:hover:bg-violet-50"
                >
                  ← Surah {nav.prev.number}: {nav.prev.englishName.split(' ')[0]}
                </Link>
              )}
              {nav.next && (
                <Link
                  href={`/quran/learn/${nav.next.number}`}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-bold text-sand-800 active:bg-violet-50 sm:ml-auto sm:justify-end sm:hover:bg-violet-50"
                >
                  Surah {nav.next.number}: {nav.next.englishName.split(' ')[0]} →
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
