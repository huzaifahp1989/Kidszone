'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Gift, Headphones, Loader2, Search, Star, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { DEFAULT_RECITER_ID } from '@/data/quran-reciters';
import type {
  QuranAudioReciter,
  QuranListenSurah,
  QuranRecordingEdition,
} from '@/lib/mp3quran-catalog';

type SurahApiResponse = {
  meta: {
    number: number;
    englishName: string;
    arabicName: string;
    ayahCount: number;
    revelation: string | null;
  };
  ayahs: Array<{
    numberInSurah: number;
    arabic: string;
    english: string;
  }>;
  error?: string;
};

type RecitersApiResponse = {
  reciters?: QuranAudioReciter[];
  surahs?: QuranListenSurah[];
  error?: string;
};

const MIN_LISTEN_SECONDS = 180;
const QURAN_LISTEN_POINTS = 25;

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function preferredEdition(reciter: QuranAudioReciter): QuranRecordingEdition {
  return reciter.editions.reduce((best, edition) =>
    edition.surahNumbers.length > best.surahNumbers.length ? edition : best
  );
}

export default function QuranListenPage() {
  const { user, refreshProfile } = useAuth();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [reciters, setReciters] = React.useState<QuranAudioReciter[]>([]);
  const [surahs, setSurahs] = React.useState<QuranListenSurah[]>([]);
  const [selectedReciterId, setSelectedReciterId] = React.useState('');
  const [selectedEditionId, setSelectedEditionId] = React.useState('');
  const [reciterSearch, setReciterSearch] = React.useState('');
  const [surahSearch, setSurahSearch] = React.useState('');
  const [selectedSurahNumber, setSelectedSurahNumber] = React.useState(1);
  const [meta, setMeta] = React.useState<SurahApiResponse['meta'] | null>(null);
  const [ayahs, setAyahs] = React.useState<SurahApiResponse['ayahs']>([]);
  const [loadingReciters, setLoadingReciters] = React.useState(true);
  const [loadingSurah, setLoadingSurah] = React.useState(true);
  const [reciterError, setReciterError] = React.useState<string | null>(null);
  const [surahError, setSurahError] = React.useState<string | null>(null);
  const [audioError, setAudioError] = React.useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = React.useState(false);
  const [listenSeconds, setListenSeconds] = React.useState(0);
  const [claiming, setClaiming] = React.useState(false);
  const [claimMessage, setClaimMessage] = React.useState<string | null>(null);

  const selectedReciter = reciters.find((reciter) => reciter.id === selectedReciterId) ?? null;
  const selectedEdition =
    selectedReciter?.editions.find((edition) => edition.id === selectedEditionId) ??
    (selectedReciter ? preferredEdition(selectedReciter) : null);
  const selectedSurah = surahs.find((surah) => surah.number === selectedSurahNumber) ?? null;
  const hasSelectedSurahAudio = Boolean(selectedEdition?.surahNumbers.includes(selectedSurahNumber));
  const audioUrl =
    selectedEdition && hasSelectedSurahAudio
      ? `${selectedEdition.server}/${String(selectedSurahNumber).padStart(3, '0')}.mp3`
      : null;

  const filteredReciters = React.useMemo(() => {
    const query = reciterSearch.trim().toLowerCase();
    return query
      ? reciters.filter((reciter) => reciter.name.toLowerCase().includes(query))
      : reciters;
  }, [reciterSearch, reciters]);

  const filteredSurahs = React.useMemo(() => {
    const query = surahSearch.trim().toLowerCase();
    return surahs.filter((surah) =>
      !query || surah.name.toLowerCase().includes(query) || String(surah.number).includes(query)
    );
  }, [surahSearch, surahs]);

  React.useEffect(() => {
    let active = true;

    async function loadReciters() {
      setLoadingReciters(true);
      setReciterError(null);
      try {
        const response = await fetch('/api/quran/listen/catalog', { cache: 'no-store' });
        const data = (await response.json()) as RecitersApiResponse;
        if (
          !response.ok ||
          !Array.isArray(data.reciters) ||
          data.reciters.length === 0 ||
          !Array.isArray(data.surahs) ||
          data.surahs.length !== 114
        ) {
          throw new Error(data.error || 'Could not load the Quran listening catalog.');
        }
        if (!active) return;

        const catalog = data.reciters;
        const savedReciterId = window.localStorage.getItem('kids-zone-quran-mp3-reciter');
        const savedEditionId = window.localStorage.getItem('kids-zone-quran-mp3-edition');
        const savedReciter = catalog.find((reciter) => reciter.id === savedReciterId);
        const defaultReciter =
          savedReciter ??
          catalog.find((reciter) => /alafasy|afasy/i.test(reciter.name)) ??
          catalog.reduce((best, reciter) =>
            preferredEdition(reciter).surahNumbers.length > preferredEdition(best).surahNumbers.length
              ? reciter
              : best
          );
        const defaultEdition =
          defaultReciter.editions.find((edition) => edition.id === savedEditionId) ??
          preferredEdition(defaultReciter);

        setReciters(catalog);
        setSurahs(data.surahs);
        setSelectedReciterId(defaultReciter.id);
        setSelectedEditionId(defaultEdition.id);
      } catch (error: unknown) {
        if (!active) return;
        setReciterError(error instanceof Error ? error.message : 'Could not load the reciter list.');
      } finally {
        if (active) setLoadingReciters(false);
      }
    }

    void loadReciters();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadSurahText() {
      setLoadingSurah(true);
      setSurahError(null);
      try {
        const response = await fetch(
          `/api/quran/surah/${selectedSurahNumber}?reciter=${encodeURIComponent(DEFAULT_RECITER_ID)}`,
          { cache: 'no-store', signal: controller.signal }
        );
        const data = (await response.json()) as SurahApiResponse;
        if (!response.ok) throw new Error(data.error || 'Could not load surah details.');
        setMeta(data.meta);
        setAyahs(data.ayahs || []);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setSurahError(error instanceof Error ? error.message : 'Could not load surah details.');
        setMeta(null);
        setAyahs([]);
      } finally {
        if (!controller.signal.aborted) setLoadingSurah(false);
      }
    }

    void loadSurahText();
    return () => controller.abort();
  }, [selectedSurahNumber]);

  React.useEffect(() => {
    if (!selectedReciterId || !selectedEditionId) return;
    window.localStorage.setItem('kids-zone-quran-mp3-reciter', selectedReciterId);
    window.localStorage.setItem('kids-zone-quran-mp3-edition', selectedEditionId);
  }, [selectedEditionId, selectedReciterId]);

  React.useEffect(() => {
    if (!isAudioPlaying) return;
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setListenSeconds((previous) => previous + 1);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isAudioPlaying]);

  const stopAudio = () => {
    audioRef.current?.pause();
    setIsAudioPlaying(false);
  };

  const onReciterChange = (nextReciterId: string) => {
    const nextReciter = reciters.find((reciter) => reciter.id === nextReciterId);
    if (!nextReciter) return;
    stopAudio();
    setSelectedReciterId(nextReciter.id);
    setSelectedEditionId(preferredEdition(nextReciter).id);
    setAudioError(null);
    setClaimMessage(null);
  };

  const onSurahChange = (nextSurahNumber: number) => {
    stopAudio();
    setSelectedSurahNumber(nextSurahNumber);
    setListenSeconds(0);
    setAudioError(null);
    setClaimMessage(null);
  };

  const claimDailyListeningPoints = async () => {
    if (!user?.id) {
      setClaimMessage('Sign in to claim Quran listening points.');
      return;
    }

    if (listenSeconds < MIN_LISTEN_SECONDS) {
      setClaimMessage('Listen for at least 3 minutes to claim points.');
      return;
    }

    setClaiming(true);
    setClaimMessage(null);
    try {
      const response = await authJsonFetch('/api/quran/listen/complete', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          surahNumber: selectedSurahNumber,
          listenedSeconds: listenSeconds,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setClaimMessage(data.error || 'Could not claim points right now.');
        return;
      }

      setClaimMessage(data.message || 'Done!');
      if (Number(data.pointsAwarded || 0) > 0) {
        void refreshProfile?.();
      }
    } catch {
      setClaimMessage('Could not connect. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="page-inner quran-learn-mobile pb-28">
      <div className="mx-auto max-w-5xl space-y-6">
        <nav aria-label="Quran sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">
          <Link
            href="/quran/learn"
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-800"
          >
            Learn Quran
          </Link>
          <Link
            href="/quran/listen"
            aria-current="page"
            className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            Listen to Quran
          </Link>
          <Link
            href="/quran/surahs"
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-800"
          >
            Surah lessons
          </Link>
        </nav>

        <header className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-100">
            <Volume2 size={14} /> Listen to Quran
          </p>
          <h1 className="mt-3 text-3xl font-black">Quran Listening Club</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Choose any of the 114 surahs and listen to reciters from around the world. Listen for at least 3 minutes
            to earn +{QURAN_LISTEN_POINTS} points each day.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/quran/learn" className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25">
              Learn Quran
            </Link>
            <Link href="/rewards" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25">
              <Gift size={16} /> Points &amp; rewards
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <label htmlFor="listen-surah-search" className="mb-2 block text-xs font-bold uppercase tracking-wide text-violet-700">
                Find a surah
              </label>
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="listen-surah-search"
                  type="search"
                  value={surahSearch}
                  onChange={(event) => setSurahSearch(event.target.value)}
                  placeholder="Search all 114 surahs"
                  className="min-h-11 w-full rounded-xl border border-violet-200 py-3 pl-10 pr-4 text-base outline-none ring-violet-200 focus:ring-2 sm:text-sm"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="listen-surah" className="mb-2 block text-xs font-bold uppercase tracking-wide text-violet-700">
                Surah
              </label>
              <select
                id="listen-surah"
                value={selectedSurahNumber}
                onChange={(event) => onSurahChange(Number(event.target.value))}
                className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none ring-violet-200 focus:ring-2 sm:text-sm"
              >
                {filteredSurahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name}
                  </option>
                ))}
                {filteredSurahs.length === 0 && <option disabled>No matching surah</option>}
              </select>
            </div>
          </div>
          {filteredSurahs.length === 0 && (
            <p className="mt-2 text-sm text-slate-600">Try another surah name or number.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-black text-violet-900">
              <Headphones size={20} /> Choose a reciter
            </h2>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">
              {loadingReciters ? 'Loading reciters…' : `${reciters.length} reciters`}
            </span>
          </div>

          <label htmlFor="listen-reciter-search" className="mb-2 block text-xs font-bold uppercase tracking-wide text-violet-700">
            Search reciters
          </label>
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="listen-reciter-search"
              type="search"
              value={reciterSearch}
              onChange={(event) => setReciterSearch(event.target.value)}
              placeholder="Type a reciter's name"
              className="min-h-11 w-full rounded-xl border border-violet-200 py-3 pl-10 pr-4 text-base outline-none ring-violet-200 focus:ring-2 sm:text-sm"
            />
          </div>
          <label htmlFor="listen-reciter" className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-violet-700">
            Reciter
          </label>
          <select
            id="listen-reciter"
            value={selectedReciterId}
            onChange={(event) => onReciterChange(event.target.value)}
            disabled={loadingReciters || reciters.length === 0}
            className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none ring-violet-200 focus:ring-2 sm:text-sm"
          >
            {filteredReciters.map((reciter) => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.name}
              </option>
            ))}
            {filteredReciters.length === 0 && <option value="">No matching reciter</option>}
          </select>
          {selectedReciter && selectedReciter.editions.length > 1 && (
            <>
              <label htmlFor="listen-edition" className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-violet-700">
                Recitation style
              </label>
              <select
                id="listen-edition"
                value={selectedEdition?.id ?? ''}
                onChange={(event) => {
                  stopAudio();
                  setSelectedEditionId(event.target.value);
                  setAudioError(null);
                }}
                className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none ring-violet-200 focus:ring-2 sm:text-sm"
              >
                {selectedReciter.editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.name} ({edition.surahNumbers.length} surahs)
                  </option>
                ))}
              </select>
            </>
          )}
          {reciterError && (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {reciterError}
            </p>
          )}
          {!loadingReciters && !reciterError && filteredReciters.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">No reciters match that search.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Now listening</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Surah {selectedSurahNumber}: {meta?.englishName || selectedSurah?.name || 'Loading…'}
            </h2>
            {meta?.arabicName && <p className="font-arabic text-2xl text-violet-800">{meta.arabicName}</p>}
            <p className="mt-1 text-sm text-slate-600">
              {meta ? `${meta.ayahCount} ayahs${meta.revelation ? ` · ${meta.revelation}` : ''}` : 'Full-surah recitation'}
              {selectedReciter ? ` · ${selectedReciter.name}` : ''}
            </p>
          </div>

          {loadingSurah && (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" /> Loading surah details…
            </p>
          )}
          {surahError && <p className="mt-4 text-sm text-amber-800">{surahError}</p>}

          <div className="mt-4">
            {loadingReciters ? (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 size={16} className="animate-spin" /> Loading audio choices…
              </p>
            ) : audioUrl ? (
              <audio
                key={audioUrl}
                ref={audioRef}
                controls
                preload="none"
                src={audioUrl}
                onPlaying={() => {
                  setAudioError(null);
                  setIsAudioPlaying(true);
                }}
                onWaiting={() => setIsAudioPlaying(false)}
                onPause={() => setIsAudioPlaying(false)}
                onEnded={() => setIsAudioPlaying(false)}
                onError={() => {
                  setIsAudioPlaying(false);
                  setAudioError('This audio could not be played. Try another reciter or recitation style.');
                }}
                aria-label={`Listen to Surah ${selectedSurah?.name ?? selectedSurahNumber} by ${selectedReciter?.name ?? 'selected reciter'}`}
                className="w-full"
              />
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This recitation does not include Surah {selectedSurahNumber}. Choose another recitation style or reciter.
              </p>
            )}
            {audioError && (
              <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {audioError}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Quran audio provided by{' '}
              <a href="https://www.mp3quran.net/" target="_blank" rel="noreferrer" className="font-semibold underline">
                MP3Quran.net
              </a>
              .
            </p>
          </div>

          {ayahs.length > 0 && (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">Read the first ayahs</summary>
              <div className="mt-3 space-y-3">
                {ayahs.slice(0, 6).map((ayah) => (
                  <div key={ayah.numberInSurah} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-arabic text-right text-xl leading-loose text-violet-900" dir="rtl">
                      {ayah.arabic}
                    </p>
                    {ayah.english && <p className="mt-1 text-sm text-slate-600">{ayah.english}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-emerald-900">
              Listening time this session: {formatSeconds(listenSeconds)}
            </p>
            <p className="text-xs font-semibold text-emerald-700">
              Listen for {formatSeconds(MIN_LISTEN_SECONDS)} to earn +{QURAN_LISTEN_POINTS} points
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={() => void claimDailyListeningPoints()} disabled={claiming || !user?.id}>
              {claiming ? 'Claiming...' : `Claim daily +${QURAN_LISTEN_POINTS} points`}
            </Button>
            <Link href="/rewards" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-900 underline">
              <Gift size={16} /> View points &amp; rewards
            </Link>
          </div>
          {!user?.id && (
            <p className="mt-3 text-sm text-amber-800">
              <Link href="/signin?next=/quran/listen" className="font-bold underline">
                Sign in
              </Link>{' '}
              to claim your daily Quran listening points.
            </p>
          )}
          {claimMessage && (
            <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
              {claimMessage}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-violet-900">
            <BookOpen size={18} /> Make listening a daily habit
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-violet-900">
            <li>Choose any surah and reciter, then listen for at least three minutes.</li>
            <li>Claim your daily points after listening. Points count toward your rewards progress.</li>
            <li>Read the ayah text alongside the recitation to learn as you listen.</li>
          </ol>
          <Link href="/rewards" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-violet-700">
            <Star size={12} /> Explore your rewards
          </Link>
        </section>
      </div>
    </div>
  );
}
