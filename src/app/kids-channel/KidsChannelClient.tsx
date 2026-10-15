'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Play, Search, Star, Tv } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import { usePointsProgress } from '@/lib/points-progress-context';
import {
  VIDEO_CATEGORIES,
  VIDEO_CATEGORY_META,
  normalizeVideoCategory,
  type VideoCategory,
  youtubeThumbnailUrl,
} from '@/lib/video-categories';
import { buildKidsIslamicSearchQuery, youtubeSearchPageUrl } from '@/lib/youtube';

type VideoSourceType = 'youtube' | 'upload' | 'external';

type LearningVideo = {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  source_type: VideoSourceType;
  video_url: string;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  points_reward: number;
};

type YTPlayerState = {
  getCurrentTime: () => number;
  getDuration: () => number;
};

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: Record<string, unknown>) => YTPlayerState;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type CategoryFilter = 'all' | VideoCategory;

function buildYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function KidsChannelClient() {
  const { user, updateLocalProfile, refreshProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get('v');

  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [completedTodayIds, setCompletedTodayIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(deepLinkId);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localWatchSeconds, setLocalWatchSeconds] = useState<Record<string, number>>({});
  const [warning, setWarning] = useState<string | null>(null);

  const htmlVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const youtubePlayers = useRef<Record<string, YTPlayerState>>({});
  const ytApiLoaded = useRef(false);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (category !== 'all' && v.category !== category) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.includes(q)
      );
    });
  }, [videos, category, query]);

  const activeVideo = useMemo(
    () => filteredVideos.find((v) => v.id === activeVideoId) || filteredVideos[0] || null,
    [filteredVideos, activeVideoId]
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        Object.assign(headers, await getAuthFetchHeaders());
      }
      const res = await fetch('/api/videos', { headers, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load videos');

      const list = ((json.videos || []) as LearningVideo[]).map((v) => ({
        ...v,
        category: normalizeVideoCategory(v.category),
        thumbnail_url: v.thumbnail_url || youtubeThumbnailUrl(v.youtube_video_id),
      }));
      setVideos(list);
      setCompletedTodayIds(new Set((json.completedTodayVideoIds || []) as string[]));
      setWarning(json.warning ? String(json.warning) : null);
      setActiveVideoId((current) => {
        const preferred = deepLinkId || current;
        if (preferred && list.some((v) => v.id === preferred)) return preferred;
        return list[0]?.id || null;
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load videos');
    } finally {
      setLoading(false);
    }
  }, [user, deepLinkId]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    if (!filteredVideos.some((v) => v.id === activeVideoId)) {
      setActiveVideoId(filteredVideos[0]?.id || null);
    }
  }, [filteredVideos, activeVideoId]);

  const awardCompletion = useCallback(
    async (video: LearningVideo, watchedSeconds: number) => {
      if (!user?.id) {
        setMessage('Sign in to earn points from videos.');
        return;
      }
      if (completedTodayIds.has(video.id)) {
        setMessage('You already earned points for this video today.');
        return;
      }
      if (awardingId) return;

      setAwardingId(video.id);
      setMessage(null);

      try {
        const res = await authJsonFetch('/api/videos/complete', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            videoId: video.id,
            watchedSeconds,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Could not award points');

        const awarded = Number(json?.pointsAwarded || 0);
        setCompletedTodayIds((prev) => new Set([...prev, video.id]));

        if (json?.profile) {
          updateLocalProfile({
            points: json.profile.points,
            weeklyPoints: json.profile.weeklyPoints,
            monthlyPoints: json.profile.monthlyPoints,
            todayPoints: json.profile.todayPoints,
          });
        }

        if (awarded > 0) {
          showPointsProgress?.({
            activity: 'other',
            activityLabel: 'Kids Channel',
            pointsEarned: awarded,
          });
          void refreshProfile();
        }

        setMessage(json?.message || `+${awarded} points added.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Could not award points');
      } finally {
        setAwardingId(null);
      }
    },
    [awardingId, completedTodayIds, refreshProfile, showPointsProgress, updateLocalProfile, user?.id]
  );

  useEffect(() => {
    if (ytApiLoaded.current || typeof window === 'undefined') return;
    ytApiLoaded.current = true;
    if (window.YT?.Player) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!activeVideo || activeVideo.source_type !== 'youtube' || !activeVideo.youtube_video_id) return;

    const mount = () => {
      const containerId = `yt-player-${activeVideo.id}`;
      if (youtubePlayers.current[activeVideo.id]) return;
      if (!window.YT?.Player || !window.YT?.PlayerState) return;

      youtubePlayers.current[activeVideo.id] = new window.YT.Player(containerId, {
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT!.PlayerState.ENDED) {
              const player = youtubePlayers.current[activeVideo.id];
              const watched = player?.getDuration?.() || 0;
              void awardCompletion(activeVideo, watched);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      mount();
      return;
    }

    window.onYouTubeIframeAPIReady = () => mount();
    const timer = window.setInterval(() => {
      if (window.YT?.Player) {
        mount();
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [activeVideo, awardCompletion]);

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-700 via-teal-600 to-sky-600 p-6 text-white shadow-lg sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
            <Tv size={14} /> Kids Zone Channel
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">Islamic videos for kids</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            Search by category, watch Quran, nasheeds, and stories — finish a video to earn points (once per day).
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-1">{videos.length} videos</span>
            <span className="rounded-full bg-gold-400/90 px-3 py-1 text-sand-900">Daily points cap applies</span>
          </div>
        </header>

        {(message || warning) && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
            {message || warning}
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos on this channel…"
            className="w-full rounded-2xl border border-sand-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-sand-900 shadow-sm outline-none ring-teal-500 focus:ring-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                category === 'all' ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
              }`}
            >
              All ({videos.length})
            </button>
            {VIDEO_CATEGORIES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  category === key ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
                }`}
              >
                {VIDEO_CATEGORY_META[key].emoji} {VIDEO_CATEGORY_META[key].label} (
                {videos.filter((v) => v.category === key).length})
              </button>
            ))}
          </div>
          <a
            href={youtubeSearchPageUrl(buildKidsIslamicSearchQuery(category, query))}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-100"
          >
            Find more on YouTube ↗
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <section className="surface-card overflow-hidden rounded-3xl p-3 sm:p-4">
            {loading ? (
              <div className="py-16 text-center text-sand-500">Loading channel…</div>
            ) : !activeVideo ? (
              <div className="space-y-3 py-16 text-center">
                <Tv className="mx-auto text-teal-600" size={36} />
                <p className="font-bold text-sand-800">No videos in this category yet</p>
                <p className="text-sm text-sand-600">Admins can add multiple YouTube links from Kids Channel CMS.</p>
                <Link href="/" className="inline-block text-sm font-bold text-teal-700 underline">
                  Back home
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl bg-black">
                  {activeVideo.source_type === 'youtube' && activeVideo.youtube_video_id ? (
                    <iframe
                      id={`yt-player-${activeVideo.id}`}
                      title={activeVideo.title}
                      src={buildYouTubeEmbedUrl(activeVideo.youtube_video_id)}
                      className="aspect-video h-auto w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={(el) => {
                        htmlVideoRefs.current[activeVideo.id] = el;
                      }}
                      controls
                      className="aspect-video h-auto w-full bg-black"
                      src={activeVideo.video_url}
                      poster={activeVideo.thumbnail_url || undefined}
                      onTimeUpdate={(e) => {
                        const current = Number((e.currentTarget as HTMLVideoElement).currentTime || 0);
                        setLocalWatchSeconds((prev) => ({ ...prev, [activeVideo.id]: current }));
                      }}
                      onEnded={() => {
                        const watched = Number(
                          localWatchSeconds[activeVideo.id] ||
                            htmlVideoRefs.current[activeVideo.id]?.duration ||
                            0
                        );
                        void awardCompletion(activeVideo, watched);
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                    {VIDEO_CATEGORY_META[activeVideo.category]?.emoji}{' '}
                    {VIDEO_CATEGORY_META[activeVideo.category]?.label}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    +{activeVideo.points_reward} pts
                  </span>
                  {formatDuration(activeVideo.duration_seconds) && (
                    <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-sand-700">
                      {formatDuration(activeVideo.duration_seconds)}
                    </span>
                  )}
                  {completedTodayIds.has(activeVideo.id) && (
                    <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-sand-800">
                      Done today
                    </span>
                  )}
                </div>
                <h2 className="px-1 text-xl font-black text-sand-900 sm:text-2xl">{activeVideo.title}</h2>
                <p className="px-1 text-sm text-sand-600">
                  {activeVideo.description || 'Watch all the way through to earn points.'}
                </p>
                {awardingId === activeVideo.id && (
                  <p className="px-1 text-sm font-semibold text-teal-700">Saving completion…</p>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wide text-sand-600">Up next</h3>
              <p className="text-xs font-semibold text-sand-500">{filteredVideos.length} videos</p>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
              {filteredVideos.map((video) => {
                const selected = video.id === activeVideo?.id;
                const completed = completedTodayIds.has(video.id);
                const thumb = video.thumbnail_url || youtubeThumbnailUrl(video.youtube_video_id);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideoId(video.id)}
                    className={`flex w-full gap-3 rounded-2xl border p-2 text-left transition ${
                      selected
                        ? 'border-teal-400 bg-teal-50 shadow-sm'
                        : 'border-sand-200 bg-white hover:border-teal-200'
                    }`}
                  >
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sand-400">
                          <Play size={18} />
                        </div>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play size={16} className="text-white" fill="white" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="line-clamp-2 text-sm font-bold text-sand-900">{video.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-sand-500">
                        {VIDEO_CATEGORY_META[video.category]?.label} · +{video.points_reward} pts
                        {completed ? ' · Done' : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
              {!loading && filteredVideos.length === 0 && (
                <div className="rounded-2xl border border-dashed border-sand-300 p-6 text-center text-sm text-sand-500">
                  Nothing here yet — try another category or search YouTube.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gold-200 bg-gold-50 p-3 text-xs text-sand-800">
              <p className="inline-flex items-center gap-1 font-bold">
                <Star size={12} /> How points work
              </p>
              <p className="mt-1">
                Watch the full video to earn points. The same video only awards once per day. Your daily points cap
                still applies.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
