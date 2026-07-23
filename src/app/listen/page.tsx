'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, Mic, Pause, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components';
import {
  KIDS_AUDIO_CATEGORIES,
  KIDS_AUDIO_CATEGORY_EMOJI,
  KIDS_AUDIO_CATEGORY_LABELS,
  type KidsAudioCategory,
  type KidsAudioTrack,
} from '@/lib/kids-audio';

type FilterCategory = KidsAudioCategory | 'all';
type FilterSource = 'all' | 'library' | 'kids';

function formatDuration(seconds: number) {
  if (!seconds || seconds < 1) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function KidsListenPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<KidsAudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<FilterCategory>('all');
  const [source, setSource] = useState<FilterSource>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (source !== 'all') params.set('source', source);
      const res = await fetch(`/api/kids-audio?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audio');
      setTracks(data.tracks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [category, source]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (track: KidsAudioTrack) => {
    if (!track.audioUrl) return;

    if (playingId === track.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;
    setPlayingId(track.id);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    void audio.play().catch(() => setPlayingId(null));
  };

  const counts = useMemo(() => {
    const library = tracks.filter((t) => t.source === 'library').length;
    const kids = tracks.filter((t) => t.source === 'kids').length;
    return { library, kids, total: tracks.length };
  }, [tracks]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/my-recordings')}>
              My recordings
            </Button>
            <Button variant="primary" onClick={() => router.push('/studio')}>
              <Mic size={16} className="mr-1 inline" /> Record
            </Button>
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
            <Headphones size={28} />
          </div>
          <h1 className="text-4xl font-bold text-islamic-dark islamic-shadow">Kids Audio</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Listen to Qur&apos;an, nasheeds, stories and hadith — picked by teachers, plus published recordings from friends.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                category === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              All
            </button>
            {KIDS_AUDIO_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                  category === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {KIDS_AUDIO_CATEGORY_EMOJI[cat]} {KIDS_AUDIO_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['all', 'Everything'],
                ['library', 'Teacher picks'],
                ['kids', 'Kids recordings'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSource(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  source === value ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={loadTracks}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-slate-500">Loading audio…</div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center space-y-4">
            <p className="text-slate-600">No audio here yet. Come back soon — or record something yourself!</p>
            <Link href="/studio" className="inline-flex text-emerald-700 font-semibold underline">
              Open Recording Studio
            </Link>
          </div>
        )}

        {!loading && tracks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Showing {counts.total} track{counts.total === 1 ? '' : 's'}
              {source === 'all' ? ` · ${counts.library} teacher · ${counts.kids} kids` : ''}
            </p>
            {tracks.map((track) => {
              const cat = (KIDS_AUDIO_CATEGORIES as readonly string[]).includes(track.category)
                ? (track.category as KidsAudioCategory)
                : null;
              const isPlaying = playingId === track.id;
              return (
                <div
                  key={track.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 flex items-center justify-center text-2xl shrink-0">
                    {track.coverEmoji || (cat ? KIDS_AUDIO_CATEGORY_EMOJI[cat] : '🎧')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-islamic-dark truncate">{track.title}</h2>
                      <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {cat ? KIDS_AUDIO_CATEGORY_LABELS[cat] : track.category}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${
                          track.source === 'library' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {track.source === 'library' ? 'Teacher' : 'Kid'}
                      </span>
                    </div>
                    {track.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{track.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {track.source === 'kids' && track.childName ? `By ${track.childName}` : null}
                      {track.durationSeconds ? `${track.source === 'kids' && track.childName ? ' · ' : ''}${formatDuration(track.durationSeconds)}` : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!track.audioUrl}
                    onClick={() => handlePlay(track)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md transition ${
                      track.audioUrl
                        ? isPlaying
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-sm text-slate-700">
          <p className="font-semibold text-islamic-dark mb-1">Want to be on Kids Audio?</p>
          <p>
            Record Qur&apos;an, a nasheed, a story or a hadith in the{' '}
            <Link href="/studio" className="font-semibold text-emerald-700 underline">
              Recording Studio
            </Link>
            . When a teacher approves and publishes it, it appears here for everyone to enjoy.
          </p>
        </div>
      </div>
    </div>
  );
}
