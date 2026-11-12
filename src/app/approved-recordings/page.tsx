'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, Mic, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import AudioPlayer, { formatClock } from '@/components/AudioPlayer';
import { RECORDING_CATEGORIES } from '@/lib/recording-categories';

type ApprovedRecording = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryLabel: string;
  categoryEmoji: string;
  storyId: string | null;
  storyTitle: string | null;
  author: string;
  durationSeconds: number;
  pointsAwarded: number;
  approvedAt: string | null;
  audioUrl: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApprovedRecordingsPage() {
  const [recordings, setRecordings] = useState<ApprovedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchApproved = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/approved-recordings', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load approved recordings.');
      const payload = await response.json();
      setRecordings(Array.isArray(payload.recordings) ? payload.recordings : []);
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching approved recordings:', fetchError);
      setError('Approved recordings could not be loaded right now. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return recordings.filter((recording) => {
      if (activeCategory !== 'all' && recording.category !== activeCategory) return false;
      if (!term) return true;
      return [recording.title, recording.author, recording.storyTitle ?? '', recording.categoryLabel]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [activeCategory, recordings, search]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const recording of recordings) {
      const key = recording.category || 'other';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [recordings]);

  const filterChips = [
    { slug: 'all', label: 'All', emoji: '✨' },
    ...RECORDING_CATEGORIES.map((category) => ({ slug: category.slug, label: category.label, emoji: category.emoji })),
  ];

  return (
    <div className="min-h-screen bg-islamic-light py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                <Sparkles size={13} aria-hidden /> Gallery
              </span>
              <h1 className="mt-2 text-3xl font-black text-gray-900">Approved Recordings</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">
                Listen to recordings our teachers have reviewed and chosen to share. Every recording stays private until an
                adult approves it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">
                <CheckCircle2 size={14} aria-hidden /> {recordings.length} published
              </span>
              <button
                type="button"
                onClick={() => fetchApproved(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden /> Refresh
              </button>
              <Link
                href="/my-recordings"
                className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
              >
                My recordings
              </Link>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="relative block">
              <span className="sr-only">Search approved recordings</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or reciter…"
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {filterChips.map((chip) => {
                const count = chip.slug === 'all' ? recordings.length : counts.get(chip.slug) || 0;
                const isActive = activeCategory === chip.slug;
                return (
                  <button
                    key={chip.slug}
                    type="button"
                    onClick={() => setActiveCategory(chip.slug)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50'
                    }`}
                  >
                    <span aria-hidden>{chip.emoji}</span>
                    {chip.label}
                    <span className={isActive ? 'text-white/80' : 'text-gray-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-islamic-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => fetchApproved(true)}
              className="mt-3 rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-teal-200 bg-white p-10 text-center">
            <p className="text-lg font-bold text-gray-800">
              {recordings.length === 0 ? 'No published recordings yet' : 'No recordings match your filters'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              {recordings.length === 0
                ? 'Recordings appear here once a teacher approves them and marks them to be published.'
                : 'Try another category or clear your search.'}
            </p>
            <Link
              href="/studio"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              <Mic size={16} aria-hidden /> Go to the Recording Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((recording) => (
              <article key={recording.id} className="flex flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-gray-900" title={recording.title}>
                      {recording.title}
                    </h2>
                    <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">by {recording.author}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                    <span aria-hidden>{recording.categoryEmoji}</span>
                    {recording.categoryLabel}
                  </span>
                </div>

                {recording.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">{recording.description}</p>
                )}

                {recording.storyId && recording.storyTitle && (
                  <Link
                    href={`/stories/${recording.storyId}`}
                    className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/60 px-3 py-1 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                  >
                    📚 Story: {recording.storyTitle}
                  </Link>
                )}

                <AudioPlayer
                  src={recording.audioUrl}
                  ariaLabel={`Play ${recording.title}`}
                  durationHint={recording.durationSeconds}
                  downloadFilename={`${recording.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.webm`}
                  className="mt-auto"
                />

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {recording.durationSeconds > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} aria-hidden /> {formatClock(recording.durationSeconds)}
                    </span>
                  )}
                  {recording.approvedAt && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} aria-hidden /> {formatDate(recording.approvedAt)}
                    </span>
                  )}
                  {recording.pointsAwarded > 0 && (
                    <span className="font-bold text-teal-700">+{recording.pointsAwarded} pts</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-2xl border border-teal-100 bg-white p-4 text-xs text-gray-600">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-teal-600" aria-hidden />
          Recordings are private by default. They only appear here after a teacher approves them, and audio is streamed
          through secure, time-limited links.
        </p>
      </div>
    </div>
  );
}
