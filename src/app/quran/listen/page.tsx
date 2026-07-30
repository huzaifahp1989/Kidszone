'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Play, Star, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { DEFAULT_RECITER_ID, QURAN_RECITERS } from '@/data/quran-reciters';
import { LONG_LISTEN_SURAHS, SHORT_LISTEN_SURAHS, type QuranListenSurah } from '@/data/quran-listen-surahs';
import { useQuranPlayback } from '@/lib/use-quran-audio';

type SurahApiResponse = {
  reciter: string;
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
    audio?: string;
  }>;
  error?: string;
};

const MIN_LISTEN_SECONDS = 180;
const QURAN_LISTEN_POINTS = 25;

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function QuranListenPage() {
  const { user, refreshProfile } = useAuth();
  const firstLoadRef = React.useRef(true);
  const [group, setGroup] = React.useState<'short' | 'long'>('short');
  const [selected, setSelected] = React.useState<QuranListenSurah>(SHORT_LISTEN_SURAHS[0]);
  const [reciterId, setReciterId] = React.useState(DEFAULT_RECITER_ID);
  const [ayahs, setAyahs] = React.useState<SurahApiResponse['ayahs']>([]);
  const [meta, setMeta] = React.useState<SurahApiResponse['meta'] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingAudio, setLoadingAudio] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [listenSeconds, setListenSeconds] = React.useState(0);
  const [claiming, setClaiming] = React.useState(false);
  const [claimMessage, setClaimMessage] = React.useState<string | null>(null);

  const { playingAyah, isPlayingAll, audioError, playAyah, playFullSurah, skip } = useQuranPlayback(ayahs);

  const hasAudio = React.useMemo(() => ayahs.some((ayah) => Boolean(ayah.audio)), [ayahs]);

  const visibleSurahs = group === 'short' ? SHORT_LISTEN_SURAHS : LONG_LISTEN_SURAHS;

  React.useEffect(() => {
    if (!visibleSurahs.some((surah) => surah.number === selected.number)) {
      setSelected(visibleSurahs[0]);
      setListenSeconds(0);
      setClaimMessage(null);
    }
  }, [group, selected.number, visibleSurahs]);

  React.useEffect(() => {
    const savedReciter = typeof window !== 'undefined' ? localStorage.getItem('kids-zone-quran-reciter') : null;
    if (savedReciter && QURAN_RECITERS.some((r) => r.id === savedReciter)) {
      setReciterId(savedReciter);
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    async function loadSurah() {
      setError(null);
      if (!active) return;
      if (firstLoadRef.current) setLoading(true);
      else setLoadingAudio(true);

      try {
        const res = await fetch(`/api/quran/surah/${selected.number}?reciter=${encodeURIComponent(reciterId)}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as SurahApiResponse;
        if (!res.ok) throw new Error(json?.error || 'Could not load surah audio.');
        if (!active) return;
        setMeta(json.meta);
        setAyahs(json.ayahs || []);
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Could not load surah audio.';
        setError(message);
        setMeta(null);
        setAyahs([]);
      } finally {
        if (!active) return;
        firstLoadRef.current = false;
        setLoading(false);
        setLoadingAudio(false);
      }
    }

    void loadSurah();

    return () => {
      active = false;
    };
  }, [selected.number, reciterId]);

  React.useEffect(() => {
    if (playingAyah == null) return;
    const timer = window.setInterval(() => {
      setListenSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [playingAyah]);

  const onReciterChange = (nextReciterId: string) => {
    setReciterId(nextReciterId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kids-zone-quran-reciter', nextReciterId);
    }
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
      const res = await authJsonFetch('/api/quran/listen/complete', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          surahNumber: selected.number,
          listenedSeconds: listenSeconds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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
        <header className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-100">
            <Volume2 size={14} /> Listen to Quran
          </p>
          <h1 className="mt-3 text-3xl font-black">Quran Listening Club</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">
            Choose short surahs for quick daily practice or listen to longer surahs like Ya-Sin and Al-Mulk with top reciters.
            Earn +{QURAN_LISTEN_POINTS} points once every day after at least 3 minutes of listening.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/quran/learn" className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25">
              Juz Amma
            </Link>
            <Link href="/quran/surahs" className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25">
              Learn a Surah
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGroup('short')}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                group === 'short' ? 'bg-violet-600 text-white' : 'border border-sand-200 bg-white text-sand-700 hover:border-violet-300'
              }`}
            >
              Short surahs
            </button>
            <button
              type="button"
              onClick={() => setGroup('long')}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                group === 'long' ? 'bg-violet-600 text-white' : 'border border-sand-200 bg-white text-sand-700 hover:border-violet-300'
              }`}
            >
              Longer surahs (Ya-Sin, Mulk...)
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSurahs.map((surah) => {
              const isActive = selected.number === surah.number;
              return (
                <button
                  key={surah.number}
                  type="button"
                  onClick={() => {
                    setSelected(surah);
                    setListenSeconds(0);
                    setClaimMessage(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-violet-200'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Surah {surah.number}</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{surah.englishName}</p>
                  <p className="font-arabic text-xl text-violet-800">{surah.arabicName}</p>
                  <p className="mt-2 text-xs text-slate-600">{surah.note}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="listen-reciter" className="mb-2 block text-xs font-bold uppercase tracking-wide text-violet-700">
            Choose reciter
          </label>
          <select
            id="listen-reciter"
            value={reciterId}
            onChange={(e) => onReciterChange(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-base font-semibold text-sand-900 outline-none ring-violet-200 focus:ring-2 sm:text-sm"
          >
            {QURAN_RECITERS.map((reciter) => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.name}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" /> Loading surah...
            </div>
          ) : error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : (
            <>
              <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Now listening</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{meta?.englishName || selected.englishName}</h2>
                <p className="font-arabic text-2xl text-violet-800">{meta?.arabicName || selected.arabicName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {meta?.ayahCount || ayahs.length} ayahs {meta?.revelation ? `· ${meta.revelation}` : ''}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="primary" onClick={playFullSurah} disabled={!hasAudio || loadingAudio}>
                  {loadingAudio ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {isPlayingAll ? 'Stop' : 'Play full surah'}
                </Button>
                <Button variant="outline" onClick={() => skip(-1)} disabled={!playingAyah}>
                  Previous ayah
                </Button>
                <Button variant="outline" onClick={() => skip(1)} disabled={!playingAyah}>
                  Next ayah
                </Button>
              </div>

              {audioError ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{audioError}</p>
              ) : null}

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-emerald-900">
                    Listening time this session: {formatSeconds(listenSeconds)}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    Minimum {formatSeconds(MIN_LISTEN_SECONDS)} to claim
                  </p>
                </div>
                <div className="mt-3">
                  <Button onClick={() => void claimDailyListeningPoints()} disabled={claiming || !user?.id}>
                    {claiming ? 'Claiming...' : `Claim daily +${QURAN_LISTEN_POINTS} points`}
                  </Button>
                </div>
                {!user?.id ? (
                  <p className="mt-3 text-sm text-amber-800">
                    <Link href="/signin?next=/quran/listen" className="font-bold underline">
                      Sign in
                    </Link>{' '}
                    to claim your daily Quran listening points.
                  </p>
                ) : null}
                {claimMessage ? (
                  <p className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
                    {claimMessage}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Quick ayah preview</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ayahs.slice(0, 6).map((ayah) => (
                    <button
                      key={ayah.numberInSurah}
                      type="button"
                      onClick={() => playAyah(ayah.numberInSurah)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-violet-200"
                    >
                      Ayah {ayah.numberInSurah}
                    </button>
                  ))}
                </div>
                {ayahs.length > 6 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Showing first 6 ayahs. Use Play full surah to continue all ayahs.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-violet-900">
            <BookOpen size={18} /> Daily Quran routine idea
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-violet-900">
            <li>Pick one short surah after salah for quick consistency.</li>
            <li>Pick one longer surah (like Ya-Sin or Al-Mulk) a few times weekly.</li>
            <li>Claim daily listening points once you complete at least 3 minutes.</li>
            <li>Use Learn a Surah pages to understand meanings, not only listen.</li>
          </ol>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700">
            <Star size={12} /> Listening helps stars and consistency every week.
          </div>
        </section>
      </div>
    </div>
  );
}
