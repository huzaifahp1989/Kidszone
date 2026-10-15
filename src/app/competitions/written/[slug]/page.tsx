'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Gift, Loader2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { trackCompetitionJoined } from '@/lib/analytics';
import {
  DEFAULT_MAX_ANSWER_LENGTH,
  isWrittenCompetitionOpen,
  type WrittenCompetition,
  type WrittenPrize,
  type WrittenQuestionPublic,
} from '@/lib/written-competition';

type Phase = 'intro' | 'quiz' | 'review' | 'confirm' | 'submitted';

type StatusPayload = {
  exists: boolean;
  canSubmit?: boolean;
  submission: {
    id: string;
    status: string;
    statusLabel: string;
    submittedAt: string;
    totalMarks: number | null;
    maxMarks: number | null;
    percentage: number | null;
    answers: Array<{
      questionNumber: number;
      questionText: string;
      answerText: string;
      maxMarks: number;
      marksAwarded: number | null;
      adminFeedback: string;
    }>;
  } | null;
};

export default function WrittenCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.slug || '');
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [competition, setCompetition] = useState<WrittenCompetition | null>(null);
  const [questions, setQuestions] = useState<WrittenQuestionPublic[]>([]);
  const [prizes, setPrizes] = useState<WrittenPrize[]>([]);
  const [winners, setWinners] = useState<Array<{ id: string; displayName: string; prizeName: string | null }>>([]);
  const [open, setOpen] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<StatusPayload['submission']>(null);

  const hasSubmitted = Boolean(status);

  const loadStatus = useCallback(async () => {
    if (!user?.id) return null;
    setStatusLoading(true);
    try {
      const res = await authJsonFetch(`/api/written-competitions/${encodeURIComponent(slug)}/status`);
      const json = (await res.json()) as StatusPayload;
      if (res.ok && json.exists) {
        setStatus(json.submission);
        setPhase('submitted');
        return json.submission;
      }
      setStatus(null);
    } catch {
      return null;
    } finally {
      setStatusLoading(false);
    }
    return null;
  }, [slug, user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/written-competitions/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load competition');
        if (cancelled) return;
        setCompetition(json.competition);
        setQuestions(json.questions || []);
        setPrizes(json.prizes || []);
        setWinners(json.winners || []);
        setOpen(Boolean(json.open));
        setSetupNeeded(Boolean((json.tableMissing || json.setupNeeded) && !(json.questions || []).length));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load competition');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (slug) void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!user?.id || !slug) return;
    void loadStatus();
  }, [loadStatus, slug, user?.id]);

  useEffect(() => {
    if (hasSubmitted && phase !== 'submitted') {
      setPhase('submitted');
    }
  }, [hasSubmitted, phase]);

  const current = questions[index] ?? null;
  const currentAnswer = current ? answers[current.id] || '' : '';
  const maxLen = competition?.maxAnswerLength || DEFAULT_MAX_ANSWER_LENGTH;
  const answeredCount = useMemo(
    () => questions.filter((question) => (answers[question.id] || '').trim().length > 0).length,
    [answers, questions]
  );

  const startQuiz = async () => {
    if (!user) {
      router.push(`/signin?next=/competitions/written/${encodeURIComponent(slug)}`);
      return;
    }
    const existing = await loadStatus();
    if (existing) {
      setError('You have already submitted this competition. Only one entry is allowed.');
      return;
    }
    setPhase('quiz');
    setIndex(0);
    trackCompetitionJoined({ competition: slug });
  };

  const setCurrentAnswer = (value: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value.slice(0, maxLen) }));
  };

  const submitAnswers = async () => {
    if (!user?.id || !competition) return;
    setSubmitting(true);
    setError('');
    try {
      const existing = await loadStatus();
      if (existing) {
        throw new Error('You have already submitted this competition. Only one entry is allowed.');
      }

      const res = await authJsonFetch(`/api/written-competitions/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: profile?.name || '',
          email: user.email || profile?.email || '',
          city: profile?.city || '',
          answers,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not submit');
      await loadStatus();
      setPhase('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-emerald-800 shadow-sm">
          <Loader2 className="animate-spin" size={18} /> Loading competition...
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-bold text-slate-800">{error || 'Competition not found'}</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-emerald-700">
          Back home
        </Link>
      </div>
    );
  }

  const closed = !open && !isWrittenCompetitionOpen(competition);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0%,_#fffbeb_32%,_#f8fafc_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-100/40">
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-700 px-6 py-8 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Islam Media Central</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{competition.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50 sm:text-base">{competition.description}</p>
          </div>
          {error && <div className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">{error}</div>}
        </section>

        {phase === 'intro' && (
          <>
            <section className="rounded-[1.75rem] border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-amber-700">
                <Gift size={16} /> Prizes
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {prizes.map((prize) => (
                  <article key={prize.id} className="overflow-hidden rounded-3xl border border-amber-100 bg-amber-50/40">
                    {prize.prizeImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prize.prizeImageUrl} alt={prize.prizeName} className="h-48 w-full object-cover" />
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-black text-slate-900">{prize.prizeName}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{prize.prizeDescription}</p>
                      {prize.sponsor && <p className="mt-3 text-xs font-bold uppercase tracking-wide text-amber-800">Sponsor: {prize.sponsor}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-black text-slate-900">How this competition works</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This is a written Seerah competition. You must type your own answer to every question. There are no A, B, C, D options and no automatic marking.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li>• {questions.length || competition.questionCount} written questions</li>
                  <li>• Type a short paragraph for each answer</li>
                  <li>• Review your answers, then submit once</li>
                  <li>• Admin reads and marks every answer by hand</li>
                  <li>• Eligible entries can enter the prize draw</li>
                </ul>
                {competition.rules && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    <p className="font-bold text-slate-800">Rules</p>
                    <p className="mt-1 whitespace-pre-wrap">{competition.rules}</p>
                  </div>
                )}
                {questions.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                    {setupNeeded
                      ? 'This competition is almost ready. An admin still needs to add the written questions.'
                      : 'Questions are being prepared. Please refresh in a moment.'}
                  </p>
                ) : hasSubmitted ? (
                  <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    You have already submitted your answers. Only one entry is allowed per participant.
                  </p>
                ) : statusLoading && user ? (
                  <p className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <Loader2 className="animate-spin" size={16} /> Checking your entry...
                  </p>
                ) : closed ? (
                  <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    This competition is closed. {status ? 'Your submitted entry is saved.' : 'New answers cannot be submitted.'}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={statusLoading}
                    onClick={() => void startQuiz()}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-amber-600 px-5 py-4 text-base font-black text-white shadow-lg"
                  >
                    <Sparkles size={18} /> {user ? 'Start writing answers' : 'Sign in to enter'}
                  </button>
                )}
                <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <ArrowLeft size={16} /> Back home
                </Link>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-lg font-black text-slate-900">Privacy</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Children&apos;s full names, emails, phone numbers and addresses are not shown on the public winner list. Public winners are shown as first name and initial, for example “Ahmed K.”
                </p>
                {winners.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Winners</p>
                    <div className="mt-3 space-y-2">
                      {winners.map((winner) => (
                        <div key={winner.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                          <p className="font-bold text-slate-900">{winner.displayName} – Winner</p>
                          {winner.prizeName && <p className="text-xs text-slate-600">{winner.prizeName}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {phase === 'quiz' && current && (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                Question {index + 1} of {questions.length}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                {answeredCount}/{questions.length} written
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-black leading-snug text-slate-900">{current.questionText}</h2>
            <p className="mt-2 text-sm text-slate-500">Write your own answer. No multiple-choice options.</p>
            <label className="mt-6 block text-sm font-black text-slate-800">Your Answer</label>
            <textarea
              value={currentAnswer}
              onChange={(event) => setCurrentAnswer(event.target.value)}
              rows={10}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              placeholder="Type your answer here..."
            />
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Characters: {currentAnswer.length} / {maxLen}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                >
                  Next question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhase('review')}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white"
                >
                  Review your answers
                </button>
              )}
            </div>
          </section>
        )}

        {(phase === 'review' || phase === 'confirm') && (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-2xl font-black text-slate-900">Review Your Answers</h2>
            <p className="mt-2 text-sm text-slate-600">You can go back and edit before final submission.</p>
            <div className="mt-6 space-y-4">
              {questions.map((question) => (
                <article key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Question {question.questionNumber}</p>
                  <p className="mt-1 font-bold text-slate-900">{question.questionText}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {(answers[question.id] || '').trim() || 'No answer written yet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIndex(questions.findIndex((item) => item.id === question.id));
                      setPhase('quiz');
                    }}
                    className="mt-3 text-sm font-bold text-emerald-800"
                  >
                    Edit this answer
                  </button>
                </article>
              ))}
            </div>

            {phase === 'review' ? (
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setPhase('quiz')} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold">
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('confirm')}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                >
                  Continue to submit
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-black text-amber-950">Submit Quiz</p>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Once you submit your answers, you will not be able to change them. Your answers will be reviewed by the admin team.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setPhase('review')} className="rounded-2xl border border-amber-300 bg-white px-5 py-3 text-sm font-bold">
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submitAnswers()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Submit Answers
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {phase === 'submitted' && status && (
          <section className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-lg sm:p-8">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={20} />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">Submission received</p>
            </div>
            <h2 className="mt-3 text-3xl font-black text-slate-900">Your answers are with the admin team</h2>
            <p className="mt-2 text-sm text-slate-600">Status: {status.statusLabel}</p>
            {status.totalMarks != null && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total marks</p>
                  <p className="mt-1 text-3xl font-black">
                    {status.totalMarks} / {status.maxMarks}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Percentage</p>
                  <p className="mt-1 text-3xl font-black">{status.percentage}%</p>
                </div>
              </div>
            )}
            {status.answers?.length > 0 && (
              <div className="mt-6 space-y-3">
                {status.answers.map((answer) => (
                  <article key={answer.questionNumber} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">Question {answer.questionNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{answer.questionText}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm">{answer.answerText}</p>
                    {answer.marksAwarded != null && (
                      <p className="mt-2 text-sm font-bold text-emerald-800">
                        Marks: {answer.marksAwarded} / {answer.maxMarks}
                      </p>
                    )}
                    {answer.adminFeedback && <p className="mt-1 text-sm text-slate-600">Feedback: {answer.adminFeedback}</p>}
                  </article>
                ))}
              </div>
            )}
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
              <Trophy size={16} /> Back home
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
