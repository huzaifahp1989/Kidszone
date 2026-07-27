'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayCircle, Star, VideoIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { usePointsProgress } from '@/lib/points-progress-context';

type VideoSourceType = 'youtube' | 'upload' | 'external';

type LearningVideo = {
  id: string;
  title: string;
  description: string;
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
      ready?: (fn: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function buildYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`;
}

export default function VideosPage() {
  const { user, updateLocalProfile, refreshProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();

  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [completedTodayIds, setCompletedTodayIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localWatchSeconds, setLocalWatchSeconds] = useState<Record<string, number>>({});

  const htmlVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const youtubePlayers = useRef<Record<string, YTPlayerState>>({});
  const ytApiLoaded = useRef(false);

  const activeVideo = useMemo(
    () => videos.find((v) => v.id === activeVideoId) || null,
    [videos, activeVideoId]
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        const authHeaders = await (await import('@/lib/auth-headers')).getAuthFetchHeaders();
        Object.assign(headers, authHeaders);
      }
      const res = await fetch('/api/videos', {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load videos');

      const list = (json.videos || []) as LearningVideo[];
      setVideos(list);
      setCompletedTodayIds(new Set((json.completedTodayVideoIds || []) as string[]));
      setActiveVideoId((current) => current || list[0]?.id || null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load videos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const awardCompletion = useCallback(async (video: LearningVideo, watchedSeconds: number) => {
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
      if (!res.ok) {
        throw new Error(json?.error || 'Could not award points');
      }

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
          activityLabel: 'Video Learning',
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
  }, [awardingId, completedTodayIds, refreshProfile, showPointsProgress, updateLocalProfile, user?.id]);

  const ensureYouTubeApi = () => {
    if (ytApiLoaded.current || typeof window === 'undefined') return;
    ytApiLoaded.current = true;

    if (window.YT?.Player) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
  };

  useEffect(() => {
    ensureYouTubeApi();
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

    window.onYouTubeIframeAPIReady = () => {
      mount();
    };

    const timer = window.setInterval(() => {
      if (window.YT?.Player) {
        mount();
        window.clearInterval(timer);
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeVideo, awardCompletion]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg">
          <h1 className="text-3xl font-extrabold text-slate-900">Watch and Earn Videos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Watch full Islamic videos to earn points. Points are awarded only after full completion.
          </p>
          {message ? (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              {message}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading videos...</div>
            ) : !activeVideo ? (
              <div className="p-8 text-center text-slate-500">No videos available yet.</div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                  {activeVideo.source_type === 'youtube' && activeVideo.youtube_video_id ? (
                    <iframe
                      id={`yt-player-${activeVideo.id}`}
                      title={activeVideo.title}
                      src={buildYouTubeEmbedUrl(activeVideo.youtube_video_id)}
                      className="h-[240px] w-full md:h-[420px]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={(el) => {
                        htmlVideoRefs.current[activeVideo.id] = el;
                      }}
                      controls
                      className="h-[240px] w-full bg-black md:h-[420px]"
                      src={activeVideo.video_url}
                      poster={activeVideo.thumbnail_url || undefined}
                      onTimeUpdate={(e) => {
                        const current = Number((e.currentTarget as HTMLVideoElement).currentTime || 0);
                        setLocalWatchSeconds((prev) => ({ ...prev, [activeVideo.id]: current }));
                      }}
                      onEnded={() => {
                        const watched = Number(localWatchSeconds[activeVideo.id] || htmlVideoRefs.current[activeVideo.id]?.duration || 0);
                        void awardCompletion(activeVideo, watched);
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    +{activeVideo.points_reward} points
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {activeVideo.duration_seconds ? `${activeVideo.duration_seconds}s` : 'Duration not set'}
                  </span>
                  {completedTodayIds.has(activeVideo.id) ? (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">Completed today</span>
                  ) : null}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{activeVideo.title}</h2>
                <p className="text-sm text-slate-600">{activeVideo.description || 'No description provided.'}</p>
                {awardingId === activeVideo.id ? (
                  <p className="text-sm font-semibold text-indigo-700">Saving completion...</p>
                ) : null}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Available Videos</h3>
            <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
              {videos.map((video) => {
                const selected = video.id === activeVideoId;
                const completed = completedTodayIds.has(video.id);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideoId(video.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{video.title}</p>
                      <PlayCircle size={16} className="mt-0.5 shrink-0 text-slate-500" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">+{video.points_reward} pts</span>
                      {completed ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">Done</span> : null}
                    </div>
                  </button>
                );
              })}
              {videos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  <VideoIcon className="mx-auto mb-2" size={20} />
                  Videos will appear here soon.
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold">How points work</p>
              <p className="mt-1">
                You only get points after the video finishes fully. Replaying the same video on the same day will not award points again.
              </p>
              <p className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-800">
                <Star size={12} /> Daily points cap still applies.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
