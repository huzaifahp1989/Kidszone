'use client';

/**
 * Shared audio player used by the approved-recording and story galleries.
 *
 * Deliberately dependency-free: it drives a single hidden <audio> element and
 * renders its own controls, so playback works identically on mobile and desktop
 * and every gallery card gets play/pause, seeking, volume and download.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

/** Only one gallery player may play at a time; starting one pauses the others. */
let activeAudio: HTMLAudioElement | null = null;
const playbackListeners = new Set<() => void>();

function notifyPlaybackChange() {
  playbackListeners.forEach((listener) => listener());
}

function claimPlayback(audio: HTMLAudioElement) {
  if (activeAudio && activeAudio !== audio) activeAudio.pause();
  activeAudio = audio;
  notifyPlaybackChange();
}

function releasePlayback(audio: HTMLAudioElement) {
  if (activeAudio === audio) activeAudio = null;
  notifyPlaybackChange();
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export interface AudioPlayerProps {
  src?: string | null;
  title?: string;
  subtitle?: string;
  /** Duration stored in the database, shown until the browser reads the real metadata. */
  durationHint?: number | null;
  /** Downloads are only offered where the viewer is permitted to keep a copy. */
  allowDownload?: boolean;
  downloadFilename?: string;
  onPlay?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function AudioPlayer({
  src,
  title,
  subtitle,
  durationHint,
  allowDownload = true,
  downloadFilename,
  onPlay,
  className = '',
  ariaLabel,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep this card in sync when another player on the page takes over playback.
  useEffect(() => {
    const listener = () => {
      const audio = audioRef.current;
      if (audio && activeAudio !== audio && !audio.paused) {
        audio.pause();
      }
    };
    playbackListeners.add(listener);
    return () => {
      playbackListeners.delete(listener);
    };
  }, []);

  // Never leave a detached <audio> playing after unmount (e.g. changing filters).
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        releasePlayback(audio);
      }
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, [src]);

  const shownDuration = duration > 0 ? duration : Number(durationHint || 0);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (audio.paused) {
      setIsLoading(true);
      claimPlayback(audio);
      try {
        await audio.play();
        setError(null);
        onPlay?.();
      } catch {
        setIsLoading(false);
        setError('Playback was blocked. Tap play again or download the audio.');
        releasePlayback(audio);
      }
    } else {
      audio.pause();
    }
  }, [onPlay, src]);

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const next = Number(event.target.value);
    setCurrentTime(next);
    if (audio) audio.currentTime = next;
  }, []);

  const handleRewind = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
    setCurrentTime(audio.currentTime);
  }, []);

  const handleVolume = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const next = Number(event.target.value);
    setVolume(next);
    setMuted(next === 0);
    if (audio) {
      audio.volume = next;
      audio.muted = next === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audio) audio.muted = nextMuted;
  }, [muted]);

  const handleDownload = useCallback(async () => {
    if (!src) return;
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadFilename || title || 'recording';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // Signed URLs can expire: fall back to opening the audio directly.
      window.open(src, '_blank', 'noopener');
    }
  }, [downloadFilename, src, title]);

  const progress = useMemo(() => (shownDuration > 0 ? (currentTime / shownDuration) * 100 : 0), [currentTime, shownDuration]);

  if (!src) {
    return (
      <div className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 ${className}`}>
        <AlertCircle size={16} className="mr-2 inline" aria-hidden />
        Audio is unavailable for this recording.
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-teal-100 bg-white p-3 shadow-sm sm:p-4 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setVolume(event.currentTarget.volume);
          setIsLoading(false);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => {
          setIsPlaying(false);
          setCurrentTime(0);
          releasePlayback(event.currentTarget);
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={() => {
          setIsPlaying(false);
          setIsLoading(false);
          setError('This audio could not be loaded. Please try again later.');
        }}
      />

      {title && (
        <p className="truncate text-sm font-bold text-gray-900" title={title}>
          {title}
        </p>
      )}
      {subtitle && <p className="mb-2 truncate text-xs text-gray-500">{subtitle}</p>}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-islamic-primary text-white shadow-md transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" aria-hidden />
          ) : isPlaying ? (
            <Pause size={20} fill="currentColor" aria-hidden />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(shownDuration, 0.1)}
            step={0.1}
            value={Math.min(currentTime, shownDuration || 0.1)}
            onChange={handleSeek}
            aria-label={ariaLabel ? `${ariaLabel} — seek` : 'Seek'}
            className="h-2 w-full cursor-pointer accent-teal-600"
          />
          <div className="flex justify-between text-[11px] font-semibold tabular-nums text-gray-500">
            <span>{formatClock(currentTime)}</span>
            <span>{shownDuration > 0 ? formatClock(shownDuration) : '--:--'}</span>
          </div>
          {progress === 0 && !isPlaying && shownDuration === 0 && (
            <p className="text-[11px] text-gray-400">Tap play to load this recording.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleRewind}
          aria-label="Rewind 10 seconds"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 sm:flex"
        >
          <RotateCcw size={15} aria-hidden />
        </button>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50"
          >
            {muted || volume === 0 ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            aria-label="Volume"
            className="h-2 w-16 cursor-pointer accent-teal-600"
          />
        </div>

        {allowDownload && (
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download audio"
            title="Download audio"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50"
          >
            <Download size={15} aria-hidden />
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
