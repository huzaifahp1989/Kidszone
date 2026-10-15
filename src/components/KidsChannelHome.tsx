'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Play, Search, Tv } from 'lucide-react';
import {
  VIDEO_CATEGORIES,
  VIDEO_CATEGORY_META,
  type VideoCategory,
} from '@/lib/video-categories';

type CategoryFilter = 'all' | VideoCategory;

type LibraryVideo = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  points_reward: number;
};

type YtHit = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail_url: string | null;
  watch_url: string;
  alreadyInChannel: boolean;
};

export function KidsChannelHome({ compact = false }: { compact?: boolean }) {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [library, setLibrary] = useState<LibraryVideo[]>([]);
  const [youtube, setYoutube] = useState<YtHit[]>([]);
  const [youtubeSource, setYoutubeSource] = useState<'api' | 'suggestions'>('suggestions');
  const [youtubeSearchUrl, setYoutubeSearchUrl] = useState('https://www.youtube.com/results?search_query=islamic+kids');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('category', category);
    if (debounced) params.set('q', debounced);

    fetch(`/api/videos/youtube-search?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        setLibrary(Array.isArray(json.library) ? json.library : []);
        setYoutube(Array.isArray(json.youtube) ? json.youtube : []);
        setYoutubeSource(json.youtubeSource === 'api' ? 'api' : 'suggestions');
        if (json.youtubeSearchUrl) setYoutubeSearchUrl(String(json.youtubeSearchUrl));
      })
      .catch(() => {
        if (!active) return;
        setLibrary([]);
        setYoutube([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, debounced]);

  const shownLibrary = useMemo(() => library.slice(0, compact ? 4 : 8), [library, compact]);
  const shownYoutube = useMemo(() => youtube.slice(0, compact ? 3 : 6), [youtube, compact]);

  return (
    <section className="space-y-4 stagger-in" aria-labelledby="kids-channel-home-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Kids Channel</p>
          <h2 id="kids-channel-home-title" className="font-heading text-2xl font-extrabold text-sand-900">
            Quran · Nasheeds · Stories
          </h2>
          <p className="mt-1 text-sm text-sand-600">
            Search Islamic kids videos by category — watch on Kids Zone Channel to earn points.
          </p>
        </div>
        <Link
          href="/kids-channel"
          className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
        >
          Open channel →
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search kids Islamic videos (quran, nasheed, stories…)"
          className="w-full rounded-2xl border border-sand-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-sand-900 shadow-sm outline-none ring-teal-500 focus:ring-2"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm ${
            category === 'all' ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
          }`}
        >
          All
        </button>
        {VIDEO_CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold sm:text-sm ${
              category === key ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
            }`}
          >
            {VIDEO_CATEGORY_META[key].emoji} {VIDEO_CATEGORY_META[key].label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-sand-800">On Kids Channel</h3>
          {loading && <span className="text-xs text-sand-500">Searching…</span>}
        </div>
        {shownLibrary.length ? (
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {shownLibrary.map((video) => (
              <Link
                key={video.id}
                href={`/kids-channel?v=${encodeURIComponent(video.id)}`}
                className="group overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300"
              >
                <div className="relative aspect-video bg-sand-100">
                  {video.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sand-400">
                      <Tv size={22} />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition group-hover:opacity-100">
                    <Play className="text-white" fill="white" size={22} />
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-bold text-sand-900 sm:text-sm">{video.title}</p>
                  <p className="mt-1 text-[10px] font-semibold text-teal-700">
                    {VIDEO_CATEGORY_META[video.category]?.label} · +{video.points_reward} pts
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-4 py-6 text-center text-sm text-sand-600">
            No saved videos in this category yet. Try YouTube finds below, or ask an admin to add some.
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-sand-800">
            {youtubeSource === 'api' ? 'YouTube finds' : 'Find on YouTube'}
          </h3>
          <a
            href={youtubeSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
          >
            Open full YouTube search <ExternalLink size={12} />
          </a>
        </div>
        <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {shownYoutube.map((item) => (
            <a
              key={item.videoId + item.title}
              href={item.watch_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-2.5 transition hover:border-teal-300"
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sand-400">
                    <Search size={16} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-bold text-sand-900">{item.title}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-sand-500">
                  {item.alreadyInChannel ? 'Already on channel' : item.channelTitle || 'YouTube'}
                </p>
              </div>
            </a>
          ))}
        </div>
        {youtubeSource === 'suggestions' && (
          <p className="mt-2 text-[11px] text-sand-500">
            Browse curated Islamic kids searches on YouTube, or watch videos already saved on Kids Channel above.
          </p>
        )}
      </div>
    </section>
  );
}
