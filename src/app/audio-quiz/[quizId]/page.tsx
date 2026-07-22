'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import { useAudioRecorder } from '@/lib/use-audio-recorder';
import { AUDIO_RECORDING_MAX_SECONDS } from '@/lib/audio-quiz';
import {
  Mic,
  Square,
  RotateCcw,
  Send,
  Trophy,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  PartyPopper,
} from 'lucide-react';

interface QuizDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  ageGroup: string;
  prizeDetails: string;
  maxRecordingSeconds: number;
  questionAudioUrl: string | null;
  bannerUrl: string | null;
}

export default function AudioQuizPlayerPage() {
  const params = useParams();
  const quizId = String(params?.quizId || '');
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = React.useState<QuizDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [ended, setEnded] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<string | null>(null);
  const [participantCount, setParticipantCount] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [done, setDone] = React.useState(false);

  const maxSeconds = quiz?.maxRecordingSeconds || AUDIO_RECORDING_MAX_SECONDS;
  const recorder = useAudioRecorder(maxSeconds);

  const load = React.useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const headers = user ? await getAuthFetchHeaders() : {};
      const res = await fetch(`/api/audio-quiz/${quizId}`, { cache: 'no-store', headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not load this quiz.');
      setQuiz(json.quiz as QuizDetail);
      setEnded(Boolean(json.ended));
      setOpen(Boolean(json.open));
      setHasSubmitted(Boolean(json.hasSubmitted));
      setSubmitStatus(json.mySubmission?.status ?? null);
      setParticipantCount(Number(json.participantCount || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, quizId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!recorder.blob || !user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const type = recorder.blob.type || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('mpeg') ? 'mp3' : 'webm';
      const fd = new FormData();
      fd.append('recording', recorder.blob, `answer.${ext}`);
      fd.append('duration', String(recorder.seconds));
      fd.append('deviceInfo', typeof navigator !== 'undefined' ? navigator.userAgent : '');
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/audio-quiz/${quizId}/submit`, { method: 'POST', headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not submit your answer.');
      setDone(true);
      setHasSubmitted(true);
      recorder.reset();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not submit your answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Center>
        <Loader2 className="mx-auto animate-spin text-[#7c3aed]" size={32} />
        <p className="mt-3 font-semibold text-[#475569]">Loading…</p>
      </Center>
    );
  }

  if (error || !quiz) {
    return (
      <Center>
        <p className="font-semibold text-rose-600">{error || 'Quiz not found.'}</p>
        <Link href="/audio-quiz" className="mt-3 inline-block font-bold text-[#6d28d9] hover:underline">
          ← Back to Audio Quiz
        </Link>
      </Center>
    );
  }

  const showRecorder = user && open && !hasSubmitted && !done;

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:py-8">
        <Link href="/audio-quiz" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6d28d9] hover:underline">
          <ArrowLeft size={15} /> All audio quizzes
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[#c4b5fd]/40 bg-white shadow-lg">
          {quiz.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quiz.bannerUrl} alt="" className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] text-6xl">
              🎙️
            </div>
          )}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f5f3ff] px-2.5 py-0.5 text-xs font-bold text-[#6d28d9]">{quiz.category}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Ages {quiz.ageGroup}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-[#1e1b4b]">{quiz.title}</h1>
            {quiz.description ? <p className="mt-1 text-[#475569]">{quiz.description}</p> : null}
            {quiz.prizeDetails ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                <Trophy size={15} /> Prize: {quiz.prizeDetails}
              </p>
            ) : null}
          </div>
        </div>

        {/* Listen to the question */}
        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-6 shadow">
          <h2 className="mb-2 flex items-center gap-2 font-black text-[#1e1b4b]">🔊 Listen to the question</h2>
          {quiz.questionAudioUrl ? (
            <audio controls src={quiz.questionAudioUrl} className="w-full">
              Your browser does not support audio playback.
            </audio>
          ) : (
            <p className="text-sm text-[#64748b]">The question audio will appear here.</p>
          )}
          <p className="mt-2 text-xs text-[#64748b]">You can replay the question as many times as you like.</p>
        </div>

        {done ? (
          <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 text-center shadow">
            <PartyPopper className="mx-auto text-emerald-500" size={36} />
            <p className="mt-2 text-xl font-black text-emerald-800">Answer submitted!</p>
            <p className="mt-1 text-[#475569]">MashaAllah! Our judges will listen and announce winners soon.</p>
            <Link href="/audio-quiz" className="mt-4 inline-block font-bold text-[#6d28d9] hover:underline">
              Back to Audio Quiz
            </Link>
          </div>
        ) : hasSubmitted ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
            <p className="mt-2 font-black text-emerald-800">You&apos;ve already entered this quiz</p>
            <p className="mt-1 text-sm text-[#475569]">
              Status: <span className="font-bold capitalize">{submitStatus || 'pending'}</span>. Only one entry per child.
            </p>
            <Link href={`/audio-quiz/${quizId}/results`} className="mt-3 inline-block font-bold text-[#6d28d9] hover:underline">
              See results & winners →
            </Link>
          </div>
        ) : ended ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow">
            <p className="font-black text-[#1e1b4b]">This quiz has ended</p>
            <Link href={`/audio-quiz/${quizId}/results`} className="mt-2 inline-block font-bold text-[#6d28d9] hover:underline">
              See the winners →
            </Link>
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center">
            <p className="font-bold text-amber-800">Sign in to record and submit your answer</p>
            <Link
              href={`/signin?next=/audio-quiz/${quizId}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-2.5 font-bold text-white shadow hover:bg-[#6d28d9]"
            >
              Sign in
            </Link>
          </div>
        ) : null}

        {/* Recorder */}
        {showRecorder ? (
          <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-6 shadow">
            <h2 className="mb-1 flex items-center gap-2 font-black text-[#1e1b4b]">🎤 Record your answer</h2>
            <p className="mb-4 text-xs text-[#64748b]">
              Speak clearly. Maximum {quiz.maxRecordingSeconds} seconds. You can re-record before submitting.
            </p>

            <div className="flex flex-col items-center gap-4">
              <div className="text-3xl font-black tabular-nums text-[#6d28d9]">
                {recorder.formatTime(recorder.seconds)}{' '}
                <span className="text-base text-[#94a3b8]">/ {recorder.formatTime(quiz.maxRecordingSeconds)}</span>
              </div>

              {recorder.isRecording ? (
                <button
                  type="button"
                  onClick={recorder.stopRecording}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:bg-rose-700"
                >
                  <Square size={20} className="fill-white" /> Stop recording
                </button>
              ) : recorder.state === 'finished' && recorder.audioUrl ? (
                <div className="w-full space-y-3">
                  <audio controls src={recorder.audioUrl} className="w-full" />
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={recorder.reset}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#c4b5fd]/60 bg-white px-4 py-2.5 font-bold text-[#6d28d9] hover:bg-[#f5f3ff]"
                    >
                      <RotateCcw size={16} /> Re-record
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {submitting ? 'Uploading…' : 'Submit answer'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={recorder.startRecording}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-8 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  <Mic size={22} /> Start recording
                </button>
              )}

              {recorder.error ? <p className="text-sm font-semibold text-rose-600">{recorder.error}</p> : null}
              {submitError ? <p className="text-sm font-semibold text-rose-600">{submitError}</p> : null}
            </div>
          </div>
        ) : null}

        <p className="text-center text-xs text-[#94a3b8]">{participantCount} children have entered so far.</p>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-8 text-center shadow-lg">{children}</div>
      </div>
    </div>
  );
}
