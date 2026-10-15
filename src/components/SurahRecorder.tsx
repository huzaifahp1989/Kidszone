'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mic, RotateCcw, Send, Square } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { useAudioRecorder } from '@/lib/use-audio-recorder';
import { trackQuranRecordingSubmitted } from '@/lib/analytics';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

type SavedRecording = {
  id: string;
  title: string;
  duration?: number;
  status: string;
  audio_url?: string;
  created_at?: string;
  admin_notes?: string | null;
  admin_feedback?: string | null;
  reviewed_at?: string | null;
  description?: string | null;
};

type RecordingPart = 'full-surah' | 'juz' | 'ayah-range' | 'other';

function getRecordingPartLabel(description?: string | null): string | null {
  try {
    const metadata = JSON.parse(description || '{}');
    return typeof metadata.partLabel === 'string' ? metadata.partLabel : null;
  } catch {
    return null;
  }
}

type Props = {
  surahNumber: number;
  surahName: string;
  arabicName: string;
  ayahCount: number;
  source?: 'juz-amma-learn' | 'hifz';
};

export function SurahRecorder({ surahNumber, surahName, arabicName, ayahCount, source = 'juz-amma-learn' }: Props) {
  const { user, profile } = useAuth();
  const maxSeconds = Math.min(600, Math.max(120, ayahCount * 25));

  const {
    state,
    seconds,
    audioUrl,
    blob,
    error: recorderError,
    isRecording,
    formatTime,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder(maxSeconds);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [pastRecordings, setPastRecordings] = useState<SavedRecording[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [recordingPart, setRecordingPart] = useState<RecordingPart>('full-surah');
  const [partDetail, setPartDetail] = useState('');

  const loadPast = useCallback(async () => {
    if (!user?.id) return;
    setLoadingPast(true);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/quran/recordings?surahNumber=${surahNumber}&source=${source}`, { headers });
      const json = await res.json();
      if (res.ok) setPastRecordings(json.recordings || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingPast(false);
    }
  }, [source, surahNumber, user?.id]);

  useEffect(() => {
    loadPast();
  }, [loadPast]);

  const handleSubmit = async () => {
    if (!blob) return;
    if (source === 'hifz' && recordingPart !== 'full-surah' && !partDetail.trim()) {
      setSubmitError('Please add the Juz number, ayah range, or part being recited.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const formData = new FormData();
      const blobType = blob.type || 'audio/webm';
      const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : 'webm';
      formData.append('recording', blob, `surah-${surahNumber}.${extension}`);
      formData.append('surahNumber', String(surahNumber));
      formData.append('surahName', surahName);
      formData.append('duration', String(seconds));
      formData.append('childName', profile?.name || '');
      formData.append('source', source);
      formData.append('recordingPart', recordingPart);
      formData.append('partDetail', partDetail.trim());

      const headers = await getAuthFetchHeaders();
      const res = await fetch('/api/quran/recordings', { method: 'POST', headers, body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit');
      }

      setSubmitSuccess('Recording sent for review. Feedback will appear here and in My Recordings.');
      trackQuranRecordingSubmitted({ surahNumber });
      reset();
      loadPast();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit recording');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = blob && seconds > 0 && !isRecording;

  return (
    <section className="surface-card rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-rose-900 sm:text-lg">
          <Mic size={20} className="text-rose-600" />
          Record your recitation
        </h2>
        <p className="mt-1 text-sm text-sand-600">
          Practice <span className="font-arabic font-bold text-violet-800">{arabicName}</span> — tap the mic,
          recite the surah, then listen back and save.
        </p>
      </div>

      {(recorderError || submitError) && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{recorderError || submitError}</p>
      )}
      {submitSuccess && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{submitSuccess}</p>
      )}

      {source === 'hifz' && (
        <div className="mb-4 grid gap-3 rounded-xl border border-sand-200 bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-sand-800">
            What part are you recording?
            <select
              value={recordingPart}
              onChange={(event) => {
                setRecordingPart(event.target.value as RecordingPart);
                setPartDetail('');
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-sand-300 bg-white px-3 text-sm font-normal"
            >
              <option value="full-surah">Full surah</option>
              <option value="juz">Juz</option>
              <option value="ayah-range">Ayah range</option>
              <option value="other">Other section</option>
            </select>
          </label>
          {recordingPart !== 'full-surah' && (
            <label className="text-sm font-bold text-sand-800">
              {recordingPart === 'juz' ? 'Juz number' : recordingPart === 'ayah-range' ? 'Ayahs' : 'Part details'}
              <input
                type={recordingPart === 'juz' ? 'number' : 'text'}
                min={recordingPart === 'juz' ? 1 : undefined}
                max={recordingPart === 'juz' ? 30 : undefined}
                value={partDetail}
                onChange={(event) => setPartDetail(event.target.value)}
                placeholder={recordingPart === 'juz' ? '1-30' : recordingPart === 'ayah-range' ? 'e.g. Ayahs 1-5' : 'Describe the section'}
                className="mt-1 min-h-11 w-full rounded-lg border border-sand-300 px-3 text-sm font-normal"
              />
            </label>
          )}
        </div>
      )}

      <div className="flex flex-col items-center rounded-2xl bg-white/80 px-4 py-6 ring-1 ring-rose-100">
        <p
          className={`font-mono text-4xl font-bold tabular-nums sm:text-5xl ${
            isRecording ? 'animate-pulse text-rose-600' : 'text-sand-800'
          }`}
        >
          {formatTime(seconds)}
        </p>
        <p className="mt-1 text-xs text-sand-500">Max {formatTime(maxSeconds)}</p>

        {state !== 'finished' ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition active:scale-95 sm:h-24 sm:w-24"
                aria-label="Start recording"
              >
                <Mic size={36} />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-sand-800 text-white shadow-lg transition active:scale-95 sm:h-24 sm:w-24"
                aria-label="Stop recording"
              >
                <Square size={28} fill="currentColor" />
              </button>
            )}
            <p className="text-sm font-medium text-sand-600">
              {isRecording ? 'Recording… tap square to stop' : 'Tap mic to start'}
            </p>
          </div>
        ) : (
          <div className="mt-6 w-full max-w-md space-y-4">
            {audioUrl && <audio controls src={audioUrl} className="w-full" preload="metadata" />}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="sm" variant="outline" onClick={reset} className="min-h-11 w-full gap-2 sm:w-auto">
                <RotateCcw size={16} /> Re-record
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="min-h-11 w-full gap-2 sm:w-auto"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Save recording
              </Button>
            </div>
            {seconds <= 0 && (
              <p className="text-center text-xs text-amber-700">
                Please record at least 1 second before saving.
              </p>
            )}
            {!user && (
              <p className="text-center text-xs text-sand-600">
                <Link href="/signin" className="font-bold text-violet-700 underline">
                  Sign in
                </Link>{' '}
                to link recordings to your account.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-amber-50/80 px-3 py-3 text-xs leading-relaxed text-amber-950 sm:text-sm">
        <strong>Tips:</strong> Find a quiet place, recite clearly, and listen to the reciter first if you need help.
      </div>

      {user && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-sand-800">Your saved recordings</h3>
          {loadingPast ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-sand-500">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          ) : pastRecordings.length === 0 ? (
            <p className="mt-2 text-sm text-sand-500">No saved recordings yet for this surah.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pastRecordings.map((rec) => {
                const feedback = rec.admin_notes?.trim() || rec.admin_feedback?.trim();
                const partLabel = getRecordingPartLabel(rec.description);
                return (
                <li
                  key={rec.id}
                  className="flex flex-col gap-2 rounded-xl border border-sand-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold capitalize text-violet-700">{rec.status}</p>
                    {partLabel && <p className="text-sm font-bold text-sand-800">{partLabel}</p>}
                    <p className="text-sm text-sand-700">
                      {rec.duration ? `${rec.duration}s` : '—'}
                      {rec.created_at && (
                        <span className="text-sand-500">
                          {' '}
                          · {new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  {rec.audio_url && (
                    <audio controls preload="none" src={rec.audio_url} className="h-9 w-full sm:max-w-xs" />
                  )}
                  {feedback && (
                    <p className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 sm:basis-full">
                      <strong>Teacher feedback:</strong> {feedback}
                    </p>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
