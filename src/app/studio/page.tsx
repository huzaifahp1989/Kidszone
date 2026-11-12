'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { trackQuranRecordingSubmitted } from '@/lib/analytics';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import { supabase } from '@/lib/supabase';
import {
  RECORDING_CATEGORIES,
  type RecordingCategory,
} from '@/lib/recording-categories';
import {
  MAX_RECORDING_BYTES,
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  clampTrimRange,
  encodeWav,
  extensionForMimeType,
  sliceChannelData,
} from '@/lib/audio-trim';

type StudioState = 'idle' | 'recording' | 'paused' | 'finished';
type SaveStatus = 'draft' | 'saved' | 'submitted';

function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.MediaRecorder) return false;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].some(
    (t) => MediaRecorder.isTypeSupported(t)
  );
}

/** Build a small array of normalised peaks for the static waveform display. */
function computePeaks(channel: Float32Array, buckets = 160): number[] {
  if (channel.length === 0) return [];
  const blockSize = Math.max(1, Math.floor(channel.length / buckets));
  const peaks: number[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const start = i * blockSize;
    let peak = 0;
    for (let j = 0; j < blockSize && start + j < channel.length; j += 1) {
      peak = Math.max(peak, Math.abs(channel[start + j]));
    }
    peaks.push(peak);
  }
  const max = Math.max(...peaks, 0.0001);
  return peaks.map((p) => Math.min(1, p / max));
}

function drawWaveform(
  canvas: HTMLCanvasElement | null,
  peaks: number[],
  activeStart = 0,
  activeEnd = 1
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, width, height);
  if (peaks.length === 0) return;

  const barWidth = width / peaks.length;
  const mid = height / 2;
  peaks.forEach((peak, index) => {
    const ratio = index / peaks.length;
    const active = ratio >= activeStart && ratio <= activeEnd;
    ctx.fillStyle = active ? '#2563eb' : '#cbd5e1';
    const barHeight = Math.max(2, peak * (height * 0.9));
    ctx.fillRect(index * barWidth, mid - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
  });
}

export default function StudioPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [category, setCategory] = useState<RecordingCategory | null>(null);
  const [title, setTitle] = useState('');
  const [childName, setChildName] = useState('');
  const [message, setMessage] = useState('');

  const [studioState, setStudioState] = useState<StudioState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [mimeType, setMimeType] = useState('audio/webm');

  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [clipDuration, setClipDuration] = useState(0);
  const [clipPeaks, setClipPeaks] = useState<number[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimApplied, setTrimApplied] = useState(false);
  const [hasPreviousTake, setHasPreviousTake] = useState(false);

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [savingStatus, setSavingStatus] = useState<SaveStatus | null>(null);

  const [recordingQuality, setRecordingQuality] = useState<{
    duration: number;
    averageVolume: number;
    hasGoodQuality: boolean;
  } | null>(null);

  // Upload fallback
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const supportsRecording = isMediaRecorderSupported();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clipBlobRef = useRef<Blob | null>(null);
  const originalBlobRef = useRef<Blob | null>(null);
  const previousTakeRef = useRef<Blob | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const livePeaksRef = useRef<number[]>([]);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (profile?.name) setChildName(profile.name);
  }, [profile?.name]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatSeconds = (value: number) => {
    const totalSeconds = Math.floor(value || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const releaseClipUrl = () => {
    setClipUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const teardownStreams = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((from = 0) => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const startAt = performance.now() - from;
    intervalRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startAt);
    }, 200);
  }, []);

  const setupAnalyser = (stream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
  };

  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i += 1) {
        const value = dataArray[i] - 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalized = Math.min(1, rms / 40);
      setLevel(normalized);

      livePeaksRef.current.push(normalized);
      if (livePeaksRef.current.length > 160) livePeaksRef.current.shift();
      drawWaveform(liveCanvasRef.current, livePeaksRef.current);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const decodeBlob = useCallback(async (blob: Blob): Promise<AudioBuffer | null> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      ctx.close().catch(() => null);
      return audioBuffer;
    } catch {
      return null;
    }
  }, []);

  const applyClip = useCallback(
    (blob: Blob, options?: { keepOriginal?: boolean }) => {
      if (options?.keepOriginal !== false) {
        originalBlobRef.current = blob;
      }
      clipBlobRef.current = blob;
      releaseClipUrl();
      const url = URL.createObjectURL(blob);
      setClipUrl(url);
      setMimeType(blob.type || 'audio/webm');
      setTrimApplied(false);
    },
    []
  );

  const analyzeQuality = useCallback(
    (buffer: AudioBuffer | null, duration: number) => {
      if (!buffer || buffer.numberOfChannels === 0) {
        setRecordingQuality({ duration, averageVolume: 0, hasGoodQuality: duration <= 300 });
        return;
      }
      const channelData = buffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i += 1) sum += channelData[i] * channelData[i];
      const averageVolume = Math.round(Math.sqrt(sum / Math.max(1, channelData.length)) * 100);
      setRecordingQuality({ duration, averageVolume, hasGoodQuality: averageVolume > 3 });
    },
    []
  );

  /** Load a finished blob into the editor: durations, peaks, waveform, quality. */
  const loadClipIntoEditor = useCallback(
    async (blob: Blob) => {
      applyClip(blob);
      const buffer = await decodeBlob(blob);
      decodedBufferRef.current = buffer;
      const duration = buffer ? buffer.duration : Math.floor(elapsedRef.current / 1000);
      setClipDuration(duration);
      setTrimStart(0);
      setTrimEnd(duration);
      const peaks = buffer && buffer.numberOfChannels > 0 ? computePeaks(buffer.getChannelData(0)) : [];
      setClipPeaks(peaks);
      analyzeQuality(buffer, Math.round(duration));
    },
    [analyzeQuality, applyClip, decodeBlob]
  );

  const resetStudio = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    teardownStreams();
    releaseClipUrl();
    chunksRef.current = [];
    clipBlobRef.current = null;
    originalBlobRef.current = null;
    decodedBufferRef.current = null;
    livePeaksRef.current = [];
    setClipPeaks([]);
    setClipDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setTrimApplied(false);
    setStudioState('idle');
    setElapsedMs(0);
    setLevel(0);
    setRecordingQuality(null);
    setUploadedFile(null);
    setMimeType('audio/webm');
  }, [teardownStreams]);

  const requestMic = async () => {
    setPermissionError(null);
    setSupportError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSupportError('Your browser does not support microphone recording. Please use a modern browser or upload a file.');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      return stream;
    } catch {
      setPermissionError(
        'Microphone access was blocked. Allow mic permission in your browser settings, then tap Record again.'
      );
      return null;
    }
  };

  const handleStart = async () => {
    if (!category) {
      setPermissionError('Choose what you want to record first.');
      return;
    }
    // Preserve the current take so a new recording never destroys it.
    if (clipBlobRef.current) {
      previousTakeRef.current = clipBlobRef.current;
      setHasPreviousTake(true);
    }

    const stream = streamRef.current || (await requestMic());
    if (!stream) return;

    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    const supportedType = preferredTypes.find(
      (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
    );
    setMimeType(supportedType || 'audio/webm');
    const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    livePeaksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      if (recorder.state === 'inactive') {
        const blobType = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setStudioState('finished');
        stopTimer();
        void loadClipIntoEditor(blob);
      }
    };
    mediaRecorderRef.current = recorder;

    if (!audioContextRef.current || !analyserRef.current) setupAnalyser(stream);

    mediaRecorderRef.current.start(1000);
    setStudioState('recording');
    setErrorMessage(null);
    setStatusMessage(null);
    startTimer(0);
    setElapsedMs(0);
    startLevelMeter();
  };

  const handlePauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setStudioState('paused');
      stopTimer();
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setStudioState('recording');
      startTimer(elapsedRef.current);
      startLevelMeter();
    }
  };

  const handleStop = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') {
      if (typeof recorder.requestData === 'function') recorder.requestData();
      recorder.stop();
    }
    stopTimer();
    // Release the mic once recording is done so the browser indicator clears.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  };

  const handleDownload = () => {
    const blob = clipBlobRef.current;
    if (!blob) return;
    const ext = extensionForMimeType(blob.type || mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'recording').replace(/[^\w\- ]+/g, '').trim() || 'recording'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleApplyTrim = async () => {
    const buffer = decodedBufferRef.current;
    if (!buffer) {
      setErrorMessage('Trim is not available for this recording. You can still save it.');
      return;
    }
    const { start, end } = clampTrimRange(trimStart, trimEnd, buffer.duration);
    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c += 1) {
      channels.push(sliceChannelData(buffer.getChannelData(c), buffer.sampleRate, start, end));
    }
    const trimmed = encodeWav(channels, buffer.sampleRate);
    clipBlobRef.current = trimmed;
    releaseClipUrl();
    const url = URL.createObjectURL(trimmed);
    setClipUrl(url);
    setMimeType('audio/wav');
    const newDuration = end - start;
    setClipDuration(newDuration);
    setTrimStart(0);
    setTrimEnd(newDuration);
    setTrimApplied(true);
    const peaks = computePeaks(channels[0]);
    setClipPeaks(peaks);
    analyzeQuality(null, Math.round(newDuration));

    // Re-decode the trimmed clip so further trims stack from the new start/end.
    const reDecoded = await decodeBlob(trimmed);
    if (reDecoded) decodedBufferRef.current = reDecoded;
    setStatusMessage('Trimmed audio ready. Listen back, then save or submit.');
  };

  const handleRestorePrevious = () => {
    const previous = previousTakeRef.current;
    if (!previous) return;
    previousTakeRef.current = null;
    setHasPreviousTake(false);
    void loadClipIntoEditor(previous);
    setStatusMessage('Restored your previous take.');
  };

  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setStatusMessage(null);
    if (file.size > MAX_RECORDING_BYTES) {
      setErrorMessage('File is too large. Please upload a file under 25 MB.');
      return;
    }
    setUploadedFile(file);
    setStudioState('finished');
    await loadClipIntoEditor(file);
  };

  /** Upload with progress + retry. Returns true on success. */
  const uploadClip = useCallback(
    (blob: Blob, status: SaveStatus): Promise<{ ok: boolean; error?: string }> => {
      const buildFormData = async () => {
        const formData = new FormData();
        const ext = extensionForMimeType(blob.type || mimeType);
        const filenameBase =
          (blob as File).name?.replace(/\.[^/.]+$/, '') || (title.trim() || 'recording');
        formData.append('recording', blob, `${filenameBase}.${ext}`);
        formData.append('category', category || '');
        formData.append('title', title.trim() || filenameBase);
        formData.append('duration', String(Math.round(clipDuration || elapsedRef.current / 1000)));
        formData.append('childName', childName || profile?.name || '');
        formData.append('message', message || '');
        formData.append('status', status);
        return formData;
      };

      const send = (headers: Record<string, string>) =>
        new Promise<{ ok: boolean; error?: string }>((done) => {
          buildFormData().then((formData) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/studio-submit');
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
              }
            };
            xhr.onload = () => {
              let payload: { success?: boolean; error?: string } = {};
              try {
                payload = JSON.parse(xhr.responseText || '{}');
              } catch {
                payload = {};
              }
              if (xhr.status >= 200 && xhr.status < 300 && payload.success) {
                done({ ok: true });
              } else if (xhr.status === 401) {
                done({ ok: false, error: 'AUTH' });
              } else {
                done({ ok: false, error: payload.error || `Upload failed (${xhr.status})` });
              }
            };
            xhr.onerror = () => done({ ok: false, error: 'Network error while uploading.' });
            xhr.send(formData);
          });
        });

      return (async () => {
        // A 401 means the Supabase access token expired — refresh and retry once.
        const first = await send(await getAuthFetchHeaders());
        if (!first.ok && first.error === 'AUTH') {
          await supabase.auth.refreshSession().catch(() => null);
          const retry = await send(await getAuthFetchHeaders());
          return retry.ok ? { ok: true } : { ok: false, error: retry.error || 'Please sign in again.' };
        }
        return first;
      })();
    },
    [category, childName, clipDuration, message, mimeType, profile?.name, title]
  );

  const handleSave = async (status: SaveStatus) => {
    const blob = clipBlobRef.current;
    if (!blob) {
      setErrorMessage('Please record or upload an audio file first.');
      return;
    }
    if (!category) {
      setErrorMessage('Please choose what you recorded.');
      return;
    }
    if (!user?.id) {
      setErrorMessage('Please sign in to save recordings.');
      return;
    }
    if (status === 'submitted' && clipDuration > 0 && clipDuration < MIN_RECORDING_SECONDS) {
      setErrorMessage('That recording is too short. Please record a little longer.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setSavingStatus(status);
    setUploadProgress(0);
    try {
      const result = await uploadClip(blob, status);
      if (!result.ok) {
        setErrorMessage(result.error || 'Failed to save recording. Your recording is safe — try again.');
        return;
      }
      if (status === 'submitted') {
        setStatusMessage('Recording sent to your teacher. JazakAllahu khayran!');
        if (category === 'quran') trackQuranRecordingSubmitted({ source: 'studio' });
      } else if (status === 'draft') {
        setStatusMessage('Saved as a draft. You can find it in My Recordings.');
      } else {
        setStatusMessage('Recording saved. You can find it in My Recordings.');
      }
    } finally {
      setSavingStatus(null);
      setUploadProgress(null);
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => null);
    };
  }, [stopTimer]);

  // Redraw the static waveform when the selection changes.
  useEffect(() => {
    if (clipPeaks.length === 0 || clipDuration <= 0) {
      drawWaveform(clipCanvasRef.current, []);
      return;
    }
    drawWaveform(clipCanvasRef.current, clipPeaks, trimStart / clipDuration, trimEnd / clipDuration);
  }, [clipPeaks, clipDuration, trimStart, trimEnd]);

  const levelPercent = Math.round(level * 100);
  const tooQuiet = recordingQuality && recordingQuality.averageVolume < 3;
  const isBusy = savingStatus !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push('/my-recordings')}>
            🎧 My Recordings
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-heading text-3xl font-black text-islamic-dark sm:text-4xl">
            🎙️ Recording Studio
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
            Record Qur&apos;an, nasheeds, reminders, Hadith or stories. Listen back, trim if you need
            to, then save or send it to your teacher.
          </p>
        </div>

        <div className="space-y-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-lg sm:p-6">
          {/* Category selector */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">What would you like to record?</p>
            <div className="flex flex-wrap gap-2">
              {RECORDING_CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition ${
                    category === c.slug
                      ? 'border-islamic-blue bg-islamic-blue text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-islamic-blue/50'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Your name</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                placeholder="Enter your name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Recording title</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                placeholder="e.g. Surah Al-Fatihah"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Note to teacher (optional)</span>
            <textarea
              className="min-h-[70px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              placeholder="e.g. Please check my tajweed."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          {/* Recorder + live waveform */}
          <div className="grid items-center gap-5 rounded-2xl bg-slate-50 p-4 md:grid-cols-[220px,1fr]">
            <div className="flex flex-col items-center gap-3">
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${
                  studioState === 'recording'
                    ? 'animate-pulse border-red-400 bg-red-50'
                    : supportsRecording
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-100 bg-slate-100 opacity-60'
                }`}
              >
                <button
                  type="button"
                  aria-label={studioState === 'recording' || studioState === 'paused' ? 'Stop recording' : 'Start recording'}
                  disabled={!supportsRecording || isBusy}
                  onClick={studioState === 'recording' || studioState === 'paused' ? handleStop : handleStart}
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg transition ${
                    studioState === 'recording'
                      ? 'bg-red-500 hover:bg-red-600'
                      : supportsRecording
                        ? 'bg-islamic-blue hover:bg-blue-700'
                        : 'cursor-not-allowed bg-slate-400'
                  }`}
                >
                  {studioState === 'recording' || studioState === 'paused' ? '■' : '●'}
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {!supportsRecording
                  ? 'Recording not supported — upload a file'
                  : studioState === 'recording'
                    ? 'Recording… tap to stop'
                    : studioState === 'paused'
                      ? 'Paused… tap to stop'
                      : studioState === 'finished'
                        ? 'Recording finished'
                        : 'Tap to start recording'}
              </p>
              <p className="font-mono text-lg font-bold text-slate-700">{formatTime(elapsedMs)}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={studioState !== 'recording' && studioState !== 'paused'}
                  onClick={handlePauseResume}
                >
                  {studioState === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="secondary" size="sm" disabled={isBusy} onClick={resetStudio}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <canvas
                ref={liveCanvasRef}
                width={640}
                height={120}
                className="h-[120px] w-full rounded-xl border border-slate-200 bg-white"
                aria-label="Live audio waveform"
              />
              <p className="text-sm font-semibold text-slate-700">Mic level</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    levelPercent < 60 ? 'bg-emerald-400' : levelPercent < 85 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Keep the bar in the green or yellow when you speak.</p>
            </div>
          </div>

          {(permissionError || supportError) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {permissionError || supportError}
            </div>
          )}

          {!supportsRecording && !permissionError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Recording isn&apos;t supported on this browser.</strong> You can still upload an audio
              file below (mp3, m4a, ogg, webm, wav — max 25 MB).
            </div>
          )}

          {/* Upload fallback */}
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <p className="mb-2 text-sm font-semibold text-slate-700">Or upload an audio file</p>
            <p className="mb-3 text-xs text-slate-500">mp3, m4a, ogg, webm, wav — max 25 MB</p>
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.ogg,.webm,.wav"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-islamic-blue file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700"
            />
            {uploadedFile ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">Loaded: {uploadedFile.name}</p>
            ) : null}
          </div>
        </div>

        {/* Preview + trim + save */}
        {clipUrl ? (
          <div className="space-y-5 rounded-3xl border border-sky-100 bg-white p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-bold text-islamic-dark">🎧 Preview &amp; edit</h2>

            <audio controls src={clipUrl} className="w-full">
              Your browser does not support the audio player.
            </audio>

            <div className="space-y-2">
              <canvas
                ref={clipCanvasRef}
                width={640}
                height={110}
                className="h-[110px] w-full rounded-xl border border-slate-200"
                aria-label="Recording waveform with trim selection"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Trim start: {formatSeconds(trimStart)}
                  <input
                    type="range"
                    min={0}
                    max={clipDuration || 0}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.1))}
                    className="mt-1 w-full"
                    disabled={trimApplied && clipDuration <= 0}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Trim end: {formatSeconds(trimEnd)}
                  <input
                    type="range"
                    min={0}
                    max={clipDuration || 0}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.1))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleApplyTrim} disabled={isBusy}>
                  ✂️ Apply trim
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(clipDuration);
                  }}
                  disabled={isBusy}
                >
                  Reset trim
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={isBusy}>
                  ⬇️ Download
                </Button>
                {hasPreviousTake ? (
                  <Button variant="secondary" size="sm" onClick={handleRestorePrevious} disabled={isBusy}>
                    ↩️ Restore previous take
                  </Button>
                ) : null}
              </div>
            </div>

            {recordingQuality ? (
              <div
                className={`rounded-xl border p-3 ${
                  recordingQuality.hasGoodQuality
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {recordingQuality.hasGoodQuality ? '✅' : '⚠️'} Recording quality
                </div>
                <div className="mt-1 space-y-0.5 text-xs">
                  <div>Duration: {recordingQuality.duration}s</div>
                  <div>Volume: {recordingQuality.averageVolume}% {tooQuiet ? '(very quiet)' : '(good)'}</div>
                </div>
                {tooQuiet ? (
                  <p className="mt-2 text-xs font-medium">
                    💡 Your recording sounds very quiet. Move closer to the mic and try again if you can.
                  </p>
                ) : null}
              </div>
            ) : null}

            {uploadProgress !== null ? (
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-islamic-blue transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Uploading… {uploadProgress}%</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => handleSave('submitted')} disabled={isBusy}>
                {savingStatus === 'submitted' ? 'Sending…' : '📤 Submit to teacher'}
              </Button>
              <Button variant="secondary" onClick={() => handleSave('saved')} disabled={isBusy}>
                {savingStatus === 'saved' ? 'Saving…' : '💾 Save recording'}
              </Button>
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={isBusy}>
                {savingStatus === 'draft' ? 'Saving…' : '📝 Save as draft'}
              </Button>
              <Button variant="outline" onClick={resetStudio} disabled={isBusy}>
                🔁 Record again
              </Button>
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                {statusMessage}
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              Your recording stays in your browser until you save or submit it. Nothing is published
              without teacher review.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-sky-100 bg-white p-6 text-center text-sm text-slate-600 shadow-lg">
            Finish recording or upload a file to preview, trim and save it here.
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-slate-700">
          <p className="font-bold text-islamic-dark">Tips for a great recording</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Find a quiet room and sit comfortably.</li>
            <li>Hold the mic a little away from your mouth.</li>
            <li>Take a deep breath and recite or speak slowly and clearly.</li>
            <li>Use ✂️ Trim if there is silence at the start or end.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
