'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Clock3, Crown, Globe, Loader2, ShieldCheck, Sparkles, Star, TimerReset } from 'lucide-react';
import {
  MASJID_AL_AQSA_MAX_TOTAL_SCORE,
  MASJID_AL_AQSA_QUESTIONS,
  MASJID_AL_AQSA_TIMER_SECONDS,
  shuffleQuestions,
  type MasjidAlAqsaQuestion,
} from '@/lib/masjid-al-aqsa-competition';

type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  mainScore: number;
  bonusScore: number;
  totalScore: number;
  reviewedAt: string | null;
};

type SubmissionStatus = {
  exists: boolean;
  submission: any | null;
};

const mainQuestions = MASJID_AL_AQSA_QUESTIONS.filter((question) => !question.isBonus);
const bonusQuestion = MASJID_AL_AQSA_QUESTIONS.find((question) => question.isBonus)!;

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function MasjidAlAqsaCompetitionPage() {
  const { user, profile, loading } = useAuth() as any;
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'submitted'>('intro');
  const [deck, setDeck] = useState<MasjidAlAqsaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bonusAnswer, setBonusAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(MASJID_AL_AQSA_TIMER_SECONDS);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardHidden, setLeaderboardHidden] = useState(true);
  const submitLockRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (profile?.name) setFullName(String(profile.name));
    if (user?.email) setEmail(String(user.email));
  }, [profile?.name, user?.email]);

  const currentQuestion = deck[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? '' : '';
  const progressPercent = deck.length ? Math.round((currentIndex / deck.length) * 100) : 0;
  const answeredCount = Object.values(answers).filter((value) => value.trim().length > 0).length;

  const loadStatus = useCallback(async () => {
    const params = new URLSearchParams();
    if (user?.id) params.set('userId', user.id);
    if (email.trim()) params.set('email', email.trim());
    if (!params.toString()) return null;

    const res = await fetch(`/api/competitions/masjid-al-aqsa/status?${params.toString()}`, { cache: 'no-store' });
    const json: SubmissionStatus = await res.json();
    if (res.ok && json.exists) {
      setExistingSubmission(json.submission);
      setPhase('submitted');
      setMessage(json.submission?.status === 'approved' ? 'Your entry has been reviewed and approved.' : 'Your entry is already submitted and waiting for review.');
      return json.submission;
    }

    return null;
  }, [email, user?.id]);

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch('/api/competitions/masjid-al-aqsa/leaderboard', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return;
    setLeaderboard(Array.isArray(json.entries) ? json.entries : []);
    setLeaderboardHidden(Boolean(json.hiddenUntilReviewed));
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!email.trim()) return;
    loadStatus().catch(() => null);
  }, [email, loadStatus, user?.id]);

  const startCompetition = async () => {
    setMessage(null);
    if (!fullName.trim() || !email.trim()) {
      setMessage('Please enter your full name and email before starting.');
      return;
    }

    const existing = await loadStatus();
    if (existing) return;

    const mainDeck = shuffleQuestions(mainQuestions);
    setDeck([...mainDeck, bonusQuestion]);
    setCurrentIndex(0);
    setAnswers({});
    setBonusAnswer('');
    setStartedAt(Date.now());
    setTimeLeft(MASJID_AL_AQSA_TIMER_SECONDS);
    setPhase('quiz');
  };

  const setAnswerForCurrent = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const submitCompetition = useCallback(async (auto = false) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        userId: user?.id || null,
        fullName: fullName.trim(),
        email: email.trim(),
        questionOrder: deck.map((question) => question.id),
        answers,
        bonusAnswer,
        timeTakenSeconds: startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
      };

      const res = await fetch('/api/competitions/masjid-al-aqsa/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Submission failed');
      }

      setExistingSubmission(json.submission);
      setPhase('submitted');
      setMessage(auto ? 'Time finished. Your answers were submitted automatically for review.' : 'Your answers were submitted for manual review.');
      await loadLeaderboard();
    } catch (error: any) {
      setMessage(error?.message || 'Could not submit answers right now.');
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }, [answers, bonusAnswer, deck, email, fullName, loadLeaderboard, startedAt, user?.id]);

  useEffect(() => {
    if (phase !== 'quiz') return;
    const tick = () => {
      if (!startedAt) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = MASJID_AL_AQSA_TIMER_SECONDS - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        void submitCompetition(true);
        return;
      }
      setTimeLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt, submitCompetition]);

  const leaderboardTotal = useMemo(() => leaderboard.reduce((max, row) => Math.max(max, row.totalScore), 0), [leaderboard]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-white px-5 py-4 text-teal-700 shadow-sm">
          <Loader2 className="animate-spin" size={20} />
          Loading competition...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff_0%,_#ffffff_35%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-xl shadow-teal-100/40">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                <Globe size={14} /> Islam Media Central
              </div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-200">
                  <ShieldCheck size={36} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    Masjid Al-Aqsa Quiz Competition
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Type your answers manually, one question at a time. You have 20 minutes total. Your submission goes to admin review, and the leaderboard stays hidden until scores are approved.
                  </p>
                </div>
              </div>

              {phase === 'quiz' && (
                <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
                    <Clock3 size={16} className="text-teal-700" /> {formatTime(timeLeft)} left
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
                    <Star size={16} className="text-amber-500" /> {answeredCount}/{deck.length} answered
                  </div>
                </div>
              )}

              {message && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {message}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white sm:p-8">
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                    <TimerReset size={30} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">Timer</p>
                    <p className="text-3xl font-black">{formatTime(timeLeft)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/85">
                  <p>10 main questions worth 1 mark each</p>
                  <p>Bonus written answer worth up to 5 marks</p>
                  <p>Total score: {MASJID_AL_AQSA_MAX_TOTAL_SCORE}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {phase === 'intro' && (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.75rem] border border-teal-100 bg-white p-6 shadow-lg shadow-teal-100/30 sm:p-8">
              <h2 className="text-2xl font-black text-slate-900">Start the competition</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter your name and email, then begin the timed competition. Your answers will be stored for manual review only.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-0 transition focus:border-teal-400 focus:bg-white"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-0 transition focus:border-teal-400 focus:bg-white"
                    placeholder="Enter your email"
                    type="email"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Rules</p>
                  <ul className="mt-2 space-y-1.5">
                    <li>• Random question order</li>
                    <li>• One question shown at a time</li>
                    <li>• Manual answers only, no multiple choice</li>
                    <li>• One submission per user</li>
                    <li>• Leaderboard appears only after admin approval</li>
                  </ul>
                </div>

                <button
                  onClick={() => void startCompetition()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-teal-200 transition hover:from-teal-500 hover:to-emerald-500"
                >
                  <Sparkles size={18} /> Start Competition
                </button>

                <Link href="/rewards" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
                  <ArrowLeft size={16} /> Back to rewards
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-lg shadow-amber-100/30 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
                <Crown size={16} /> Competition Preview
              </div>
              <div className="mt-4 space-y-3">
                {MASJID_AL_AQSA_QUESTIONS.slice(0, 4).map((question) => (
                  <div key={question.id} className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-800">{question.prompt}</p>
                    <p className="mt-1 text-xs text-slate-500">Manual answer required</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  Bonus question: explain at least 3 virtues or historical events connected to Masjid Al-Aqsa.
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === 'quiz' && currentQuestion && (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Question {currentIndex + 1} of {deck.length}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {currentQuestion.isBonus ? 'Bonus written question' : 'Main question'}
                </h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                {progressPercent}% complete
              </div>
            </div>

            <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="text-lg font-semibold leading-8 text-slate-900">{currentQuestion.prompt}</p>
              <p className="mt-2 text-sm text-slate-500">Type your answer in your own words. No multiple choice.</p>

              <textarea
                value={currentQuestion.isBonus ? bonusAnswer : currentAnswer}
                onChange={(event) => (currentQuestion.isBonus ? setBonusAnswer(event.target.value) : setAnswerForCurrent(event.target.value))}
                rows={6}
                className="mt-4 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-400"
                placeholder={currentQuestion.isBonus ? 'Write your bonus answer here...' : 'Type your answer here...'}
              />

              <div className="mt-4 text-sm text-slate-500">
                {currentQuestion.isBonus ? 'This bonus question can earn up to 5 marks.' : `Reference: ${currentQuestion.reference}`}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex gap-3">
                {currentIndex < deck.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(deck.length - 1, prev + 1))}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Next question
                  </button>
                ) : (
                  <button
                    onClick={() => void submitCompetition(false)}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:from-teal-500 hover:to-emerald-500 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Submit for review
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You will be submitted automatically when the timer reaches zero.
            </div>
          </section>
        )}

        {phase === 'submitted' && (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-100/40 sm:p-8">
              <div className="flex items-center gap-3 text-emerald-700">
                <ShieldCheck size={22} />
                <p className="text-sm font-bold uppercase tracking-[0.2em]">Submission received</p>
              </div>
              <h2 className="mt-4 text-3xl font-black text-slate-900">
                {existingSubmission?.status === 'approved' ? 'Your score has been approved' : 'Your answers have been sent for review'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {existingSubmission?.status === 'approved'
                  ? 'Admin has reviewed your answers and approved your score. The leaderboard now shows approved entries only.'
                  : 'Admin will review each answer manually, add bonus marks, and approve winners before the leaderboard appears.'}
              </p>

              {existingSubmission && (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Main score</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{existingSubmission.main_score ?? 0}/10</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Bonus</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{existingSubmission.bonus_marks ?? 0}/5</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Total</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{existingSubmission.total_score ?? 0}/{MASJID_AL_AQSA_MAX_TOTAL_SCORE}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/rewards" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                  Back to rewards
                </Link>
                <button
                  onClick={() => void loadLeaderboard()}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Refresh leaderboard
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-lg shadow-amber-100/40 sm:p-8">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
                <Crown size={16} /> Leaderboard
              </div>
              {leaderboardHidden ? (
                <div className="mt-4 rounded-3xl border border-dashed border-amber-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
                  The leaderboard is hidden until admin approves at least one score.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {leaderboard.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">#{row.rank} {row.name}</p>
                          <p className="text-xs text-slate-500">Reviewed and approved</p>
                        </div>
                        <p className="text-right text-lg font-black text-amber-600">{row.totalScore}/{MASJID_AL_AQSA_MAX_TOTAL_SCORE}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Top approved score: {leaderboardTotal}/{MASJID_AL_AQSA_MAX_TOTAL_SCORE}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
