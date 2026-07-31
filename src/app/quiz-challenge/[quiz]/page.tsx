'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { isChallengeQuizKey } from '@/data/challenge-quizzes';
import {
  Clock,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  PartyPopper,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Hash,
} from 'lucide-react';

interface QuizMeta {
  key: string;
  title: string;
  emoji: string;
  description: string;
  passScore: number;
  awardsBadge: boolean;
  manualReview?: boolean;
  timerSeconds: number;
  mainCount: number;
  bonusCount: number;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  isBonus: boolean;
  points: number;
  topic?: string | null;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
}

interface ReviewItem {
  id: string;
  prompt: string;
  response: string;
  correct: boolean;
  answer: string;
  explanation: string;
  isBonus: boolean;
}

interface QuizResult {
  score: number;
  total: number;
  bonusScore: number;
  bonusTotal: number;
  passed: boolean;
  awardedBadge: boolean;
  review: ReviewItem[];
}

interface ManualSubmitResponse {
  submissionId: string;
  maxPointsAvailable: number;
  message: string;
}

const ENCOURAGEMENTS = [
  'MashaAllah, great effort! 🌟',
  'Well done — keep going! 💪',
  'Nice try! On to the next one. ✨',
  'You are doing brilliantly! 🌙',
  'Keep it up, little scholar! 📖',
  'Barakallahu feek! 🤲',
];

type Phase =
  | 'loading'
  | 'signin'
  | 'intro'
  | 'playing'
  | 'manual-review-summary'
  | 'submitting'
  | 'manual-submitted'
  | 'done'
  | 'completed';

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const quizKey = String(params?.quiz || '');
  const { user, profile, loading: authLoading } = useAuth();

  const [phase, setPhase] = React.useState<Phase>('loading');
  const [meta, setMeta] = React.useState<QuizMeta | null>(null);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [index, setIndex] = React.useState(0);
  const [current, setCurrent] = React.useState('');
  const [encouragement, setEncouragement] = React.useState('');
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const [review, setReview] = React.useState<ReviewItem[]>([]);
  const [remaining, setRemaining] = React.useState(0);
  const [error, setError] = React.useState('');
  const [persisted, setPersisted] = React.useState(true);
  const [manualSubmit, setManualSubmit] = React.useState<ManualSubmitResponse | null>(null);
  const [answeredCount, setAnsweredCount] = React.useState(0);

  const startRef = React.useRef<number>(0);
  const submittedRef = React.useRef(false);
  const answersRef = React.useRef<Record<string, string>>({});
  answersRef.current = answers;

  const validKey = isChallengeQuizKey(quizKey);
  const isManual = Boolean(meta?.manualReview);

  // Load quiz meta + questions, and check whether the child already completed it.
  React.useEffect(() => {
    if (!validKey) {
      setError('This quiz was not found.');
      setPhase('done');
      return;
    }
    if (authLoading) return;
    if (!user) {
      setPhase('signin');
      return;
    }

    let active = true;
    (async () => {
      try {
        const statusRes = await authJsonFetch(`/api/quiz-challenge/status?quiz=${quizKey}`);
        const statusJson = await statusRes.json();
        if (active && statusJson?.completed) {
          // For manual-review quizzes, show the "submitted and under review" screen
          // using the manual-submitted phase rather than the auto-graded result view.
          if (statusJson.manualReview) {
            const status = String(statusJson.manualStatus || 'pending');
            const result = statusJson.result as QuizResult | undefined;
            setManualSubmit({
              submissionId: statusJson.result?.completedAt ? 'existing' : 'existing',
              maxPointsAvailable: Number(result?.total ?? 0),
              message:
                status === 'approved'
                  ? 'MashaAllah! Your quiz has been reviewed and points have been added to your account. BarakAllahu feek!'
                  : status === 'rejected'
                  ? 'Your submission was reviewed. Please speak to your parents if you have any questions.'
                  : status === 'reviewing'
                  ? 'Your answers are currently being reviewed by our admin team. Please check back shortly, in sha Allah!'
                  : 'You already submitted this quiz. Your answers are being reviewed by our team!',
            });
            setPhase('manual-submitted');
            return;
          }
          setResult(statusJson.result as QuizResult);
          setReview((statusJson.result?.review as ReviewItem[]) || []);
          setPhase('completed');
          return;
        }

        const res = await fetch(`/api/quiz-challenge/questions?quiz=${quizKey}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Could not load the quiz.');
        if (!active) return;
        setMeta(json.quiz as QuizMeta);
        setQuestions(json.questions as QuizQuestion[]);
        setRemaining(Number(json.quiz?.timerSeconds || 1200));
        setPhase('intro');
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Something went wrong.');
          setPhase('done');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [validKey, authLoading, user, quizKey]);

  // Recalculate answered count whenever answers change
  React.useEffect(() => {
    const n = Object.values(answersRef.current).filter((v) => v && v.trim().length > 0).length;
    setAnsweredCount(n);
  }, [answers]);

  const submitQuiz = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current || !meta || !user) return;

      // Make sure the currently typed answer is captured.
      const finalAnswers = { ...answersRef.current };
      const q = questions[index];
      if (q && current.trim()) finalAnswers[q.id] = current.trim();

      if (meta.manualReview) {
        submittedRef.current = true;
        setPhase('submitting');

        const deviceInfo =
          typeof window !== 'undefined'
            ? `${navigator.platform} ${navigator.userAgent.slice(0, 120)}`
            : null;

        const answerPayload = questions.map((qq) => ({
          questionId: qq.id,
          questionTopic: qq.topic ?? null,
          questionPrompt: qq.prompt,
          referenceAnswer: qq.answer,
          answerText: (finalAnswers[qq.id] || '').trim(),
          maxPoints: qq.points,
        }));

        try {
          const res = await authJsonFetch('/api/manual-quiz/submit', {
            method: 'POST',
            body: JSON.stringify({
              userId: user.id,
              quiz: quizKey,
              answers: answerPayload,
              userName: profile?.name ?? null,
              email: profile?.email ?? user.email ?? null,
              city: (profile as { city?: string | null } | null)?.city ?? null,
              age: (profile as { age?: number | null } | null)?.age ?? null,
              contactNumber:
                (profile as { contact_number?: string | null; contactNumber?: string | null } | null)
                  ?.contact_number ??
                (profile as { contactNumber?: string | null } | null)?.contactNumber ??
                null,
              deviceInfo,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            if (res.status === 409) {
              setManualSubmit({
                submissionId: 'existing',
                maxPointsAvailable: 0,
                message:
                  json?.error ||
                  'You already submitted this quiz. Your answers are being reviewed by our team!',
              });
              setPhase('manual-submitted');
              return;
            }
            throw new Error(json?.error || 'Could not submit your answers.');
          }
          setManualSubmit(json as ManualSubmitResponse);
          try {
            window.localStorage.setItem(`quiz-challenge-done-${quizKey}-${user.id}`, '1');
          } catch {
            /* ignore */
          }
          setPhase('manual-submitted');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not submit your answers.');
          submittedRef.current = false;
          setPhase('manual-review-summary');
        }
        return;
      }

      // Normal auto-graded flow
      submittedRef.current = true;
      setPhase('submitting');
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
      try {
        const res = await authJsonFetch('/api/quiz-challenge/submit', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            quiz: quizKey,
            answers: finalAnswers,
            durationSeconds,
            autoSubmitted: auto,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Could not submit your answers.');
        setResult(json.result as QuizResult);
        setReview((json.review as ReviewItem[]) || (json.result?.review as ReviewItem[]) || []);
        setPersisted(Boolean(json.persisted));
        try {
          window.localStorage.setItem(`quiz-challenge-done-${quizKey}-${user.id}`, '1');
        } catch {
          /* ignore */
        }
        setPhase(json.alreadyCompleted ? 'completed' : 'done');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit your answers.');
        submittedRef.current = false;
        setPhase('playing');
      }
    },
    [meta, user, questions, index, current, quizKey, profile]
  );

  // Countdown timer with auto-submit.
  React.useEffect(() => {
    if (phase !== 'playing') return;
    if (remaining <= 0) {
      submitQuiz(true);
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, remaining, submitQuiz]);

  const startQuiz = () => {
    startRef.current = Date.now();
    setIndex(0);
    setCurrent(answersRef.current[questions[0]?.id] || '');
    setPhase('playing');
  };

  const goNext = () => {
    const q = questions[index];
    if (!q) return;
    const updated = { ...answersRef.current, [q.id]: current.trim() };
    setAnswers(updated);
    setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);

    if (index + 1 >= questions.length) {
      if (isManual) {
        setPhase('manual-review-summary');
      } else {
        submitQuiz(false);
      }
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setCurrent(updated[questions[nextIndex].id] || '');
  };

  const goBack = () => {
    if (index === 0) return;
    const q = questions[index];
    if (q) setAnswers((prev) => ({ ...prev, [q.id]: current.trim() }));
    const prevIndex = index - 1;
    setIndex(prevIndex);
    setCurrent(answersRef.current[questions[prevIndex].id] || '');
  };

  const jumpToSummary = () => {
    const q = questions[index];
    if (q) setAnswers((prev) => ({ ...prev, [q.id]: current.trim() }));
    setPhase('manual-review-summary');
  };

  const goToQuestion = (i: number) => {
    const q = questions[index];
    if (q) setAnswers((prev) => ({ ...prev, [q.id]: current.trim() }));
    setIndex(i);
    setCurrent(answersRef.current[questions[i].id] || '');
    setPhase('playing');
  };

  // ---- Render helpers ----------------------------------------------------

  if (phase === 'loading' || authLoading) {
    return (
      <CenterCard>
        <Loader2 className="mx-auto animate-spin text-[#7c3aed]" size={32} />
        <p className="mt-3 font-semibold text-[#475569]">Loading your quiz…</p>
      </CenterCard>
    );
  }

  if (phase === 'signin') {
    return (
      <CenterCard>
        <p className="text-lg font-bold text-[#1e1b4b]">Please sign in to take this quiz</p>
        <p className="mt-1 text-sm text-[#475569]">Your score is saved so you only get one attempt.</p>
        <Link
          href={`/signin?next=/quiz-challenge/${quizKey}`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-2.5 font-bold text-white shadow transition hover:bg-[#6d28d9]"
        >
          Sign in <ArrowRight size={16} />
        </Link>
      </CenterCard>
    );
  }

  if (phase === 'manual-submitted' && manualSubmit) {
    return (
      <ManualSubmittedView
        response={manualSubmit}
        childName={profile?.name || 'Friend'}
        quizTitle={meta?.title || quizKey}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        onBack={() => router.push('/quiz-challenge')}
        onLeaderboard={() => router.push('/quiz-challenge/leaderboard')}
      />
    );
  }

  if ((phase === 'done' || phase === 'completed') && result) {
    return (
      <ResultsView
        result={result}
        review={review}
        childName={profile?.name || 'Friend'}
        quizTitle={meta?.title || (quizKey === 'fiqh' ? 'Fiqh Quiz' : 'Quran Stories Quiz')}
        alreadyCompleted={phase === 'completed'}
        persisted={persisted}
        onLeaderboard={() => router.push('/quiz-challenge/leaderboard')}
      />
    );
  }

  if (phase === 'done' && error) {
    return (
      <CenterCard>
        <XCircle className="mx-auto text-rose-500" size={32} />
        <p className="mt-3 font-semibold text-[#475569]">{error}</p>
        <Link href="/quiz-challenge" className="mt-4 inline-block font-bold text-[#6d28d9] hover:underline">
          ← Back to Quiz Challenge
        </Link>
      </CenterCard>
    );
  }

  if (phase === 'manual-review-summary' && isManual) {
    const q = questions[index];
    if (q) {
      // Capture any currently typed answer before showing summary
      const updated = { ...answersRef.current, [q.id]: current.trim() };
      if (updated[q.id] !== answersRef.current[q.id]) {
        setAnswers(updated);
      }
    }
    return (
      <ManualReviewSummaryView
        questions={questions}
        answers={answersRef.current}
        onGoBack={goBack}
        onJump={goToQuestion}
        onSubmit={() => submitQuiz(false)}
        quizTitle={meta?.title || quizKey}
        error={error}
        onErrorChange={setError}
      />
    );
  }

  if (phase === 'intro' && meta) {
    return (
      <CenterCard>
        <div className="text-5xl">{meta.emoji}</div>
        <h1 className="mt-2 text-3xl font-black text-[#1e1b4b]">{meta.title}</h1>
        <p className="mt-2 text-[#475569]">{meta.description}</p>
        <div className="mt-4 grid gap-2 text-left text-sm text-[#5b21b6]">
          <p className="flex items-center gap-2">
            <Clock size={16} /> You have {Math.round(meta.timerSeconds / 60)} minutes.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {meta.mainCount} questions + {meta.bonusCount} bonus.
          </p>
          {isManual ? (
            <>
              <p className="flex items-center gap-2">
                <MessageSquare size={16} /> Write full answers — admins read each one.
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={16} /> One submission only — admin awards points.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2">
                <Award size={16} /> Type your answers. Small spelling slips are okay!
              </p>
              <p className="flex items-center gap-2">
                <Trophy size={16} /> One attempt only — give it your best!
              </p>
            </>
          )}
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
        <button
          type="button"
          onClick={startQuiz}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3.5 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5"
        >
          Start Quiz <ArrowRight size={18} />
        </button>
      </CenterCard>
    );
  }

  if (phase === 'submitting') {
    return (
      <CenterCard>
        <Loader2 className="mx-auto animate-spin text-[#7c3aed]" size={32} />
        <p className="mt-3 font-semibold text-[#475569]">
          {isManual ? 'Submitting your answers for review…' : 'Marking your answers…'}
        </p>
      </CenterCard>
    );
  }

  // phase === 'playing'
  const playQ = questions[index];
  const total = questions.length;
  const progress = total ? ((index + 1) / total) * 100 : 0;
  const isLast = index + 1 >= total;
  const lowTime = remaining <= 60;

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/quiz-challenge" className="text-sm font-bold text-[#6d28d9] hover:underline">
            ← Exit
          </Link>
          <div className="flex items-center gap-2">
            {isManual ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                <MessageSquare size={14} /> Manual Review
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black tabular-nums ${
                lowTime ? 'bg-rose-100 text-rose-700' : 'bg-white text-[#6d28d9] shadow-sm'
              }`}
              aria-label="Time remaining"
            >
              <Clock size={15} /> {formatTime(remaining)}
            </span>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#6d28d9]">
          <span>
            Question {index + 1} of {total}
            {playQ?.topic ? (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                {playQ.topic}
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-2">
            {playQ?.isBonus ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">⭐ Bonus</span>
            ) : null}
            {playQ?.points ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                🏆 {playQ.points} pts
              </span>
            ) : null}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {encouragement ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm font-bold text-emerald-700">
            {encouragement}
          </p>
        ) : null}

        <div className="mt-4 rounded-3xl border border-[#c4b5fd]/40 bg-white p-6 shadow-lg">
          <p className="text-xl font-bold leading-8 text-[#1e1b4b] md:text-2xl">{playQ?.prompt}</p>
          {isManual ? (
            <textarea
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              rows={6}
              placeholder="Write your answer clearly… A real admin will read this, so give details when you can! (e.g. Surah names, Hadith references, the Prophet ﷺ's name with sallallahu alayhi wasallam)"
              className="mt-5 w-full rounded-2xl border-2 border-[#c4b5fd]/60 bg-[#faf5ff] px-4 py-4 text-base font-semibold leading-7 text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
            />
          ) : (
            <input
              type="text"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goNext();
              }}
              autoFocus
              placeholder="Type your answer here…"
              className="mt-5 w-full rounded-2xl border-2 border-[#c4b5fd]/60 bg-[#faf5ff] px-4 py-4 text-lg font-semibold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
            />
          )}
          {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#c4b5fd]/60 bg-white px-4 py-2.5 font-bold text-[#6d28d9] transition hover:bg-[#f5f3ff] disabled:opacity-40"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {isManual ? (
                <button
                  type="button"
                  onClick={jumpToSummary}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  📋 Review &amp; Submit
                </button>
              ) : null}
              <button
                type="button"
                onClick={goNext}
                className="inline-flex flex-1 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
              >
                {isLast ? (isManual ? 'Review Answers' : 'Finish Quiz') : 'Next Question'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-8 text-center shadow-lg">{children}</div>
      </div>
    </div>
  );
}

function ManualReviewSummaryView({
  questions,
  answers,
  onGoBack,
  onJump,
  onSubmit,
  quizTitle,
  error,
  onErrorChange,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onGoBack: () => void;
  onJump: (i: number) => void;
  onSubmit: () => void;
  quizTitle: string;
  error: string;
  onErrorChange: (e: string) => void;
}) {
  const answered = questions.filter((q) => (answers[q.id] || '').trim().length > 0).length;
  const total = questions.length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-center shadow-lg">
          <MessageSquare className="mx-auto text-amber-500" size={36} />
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-700">Review before submit</p>
          <h1 className="mt-1 text-2xl font-black text-[#1e1b4b]">{quizTitle}</h1>
          <p className="mt-1 text-sm text-[#475569]">
            You answered <span className="font-black text-amber-700">{answered}/{total}</span> questions.
            Admins read each one — write as clearly as you can! You may still leave hard ones blank.
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3">
          {questions.map((q, i) => {
            const text = (answers[q.id] || '').trim();
            const done = text.length > 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(i)}
                className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  done
                    ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                    : 'border-rose-200 bg-rose-50/60 hover:bg-rose-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[#475569] shadow-sm">
                        Q{i + 1}
                      </span>
                      {q.topic ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">{q.topic}</span>
                      ) : null}
                      {q.isBonus ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">⭐ Bonus</span>
                      ) : null}
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                        🏆 {q.points} pts
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-6 text-[#1e1b4b]">{q.prompt}</p>
                    {done ? (
                      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold leading-6 text-[#1e1b4b]">
                        {text}
                      </p>
                    ) : (
                      <p className="mt-2 rounded-xl border border-rose-200 bg-white p-3 text-sm font-semibold text-rose-600">
                        (not answered yet — click to edit)
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {done ? (
                      <CheckCircle2 className="text-emerald-500" size={22} />
                    ) : (
                      <XCircle className="text-rose-400" size={22} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#c4b5fd]/60 bg-white px-5 py-3 font-bold text-[#6d28d9] shadow-sm transition hover:bg-[#f5f3ff]"
          >
            <ArrowLeft size={16} /> Back to last question
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              onErrorChange('');
              setSubmitting(true);
              try {
                onSubmit();
              } finally {
                setTimeout(() => setSubmitting(false), 3000);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <MessageSquare size={16} /> Submit for Admin Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualSubmittedView({
  response,
  childName,
  quizTitle,
  totalQuestions,
  answeredCount,
  onBack,
  onLeaderboard,
}: {
  response: ManualSubmitResponse;
  childName: string;
  quizTitle: string;
  totalQuestions: number;
  answeredCount: number;
  onBack: () => void;
  onLeaderboard: () => void;
}) {
  const isExisting = response.submissionId === 'existing';
  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] p-8 text-center text-white shadow-lg">
          {isExisting ? (
            <ShieldCheck className="mx-auto text-amber-200" size={40} />
          ) : (
            <PartyPopper className="mx-auto" size={40} />
          )}
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
            {isExisting ? 'Already Submitted' : 'Submission Received!'}
          </p>
          <h2 className="mt-1 text-3xl font-black">JazakAllahu Khayran, {childName}! 🤲</h2>
          <p className="mt-3 mx-auto max-w-lg text-sm text-violet-100">{response.message}</p>
          <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-violet-50">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Answered {answeredCount}/{totalQuestions}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={14} /> Max {response.maxPointsAvailable || '—'} pts possible
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-lg">
          <div className="mb-3 flex items-center gap-2 text-lg font-black text-[#1e1b4b]">
            <MessageSquare className="text-amber-600" size={22} /> What happens next?
          </div>
          <ol className="space-y-2 text-[#475569]">
            <li className="flex gap-2">
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
                1
              </span>
              <span>
                Our Admin team reads every answer you wrote for <b>{quizTitle}</b>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
                2
              </span>
              <span>
                Each question is marked <b>Correct / Partial / Incorrect</b> and points are awarded manually.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
                3
              </span>
              <span>
                Once approved, your points automatically appear in your account (check the navbar 🏆).
              </span>
            </li>
          </ol>
          <p className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm font-semibold text-violet-800">
            ⚠️ Note: Because a real Admin reads every answer, it may take a few hours to a day for points to
            appear. Please be patient and in sha Allah they will be with you soon!
          </p>
        </div>

        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-5 shadow-sm">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#6d28d9]">Your details</div>
          <ul className="grid gap-2 text-sm text-[#475569] sm:grid-cols-2">
            <li className="inline-flex items-center gap-2">
              <Award size={16} className="text-[#7c3aed]" /> Quiz: <b>{quizTitle}</b>
            </li>
            <li className="inline-flex items-center gap-2">
              <Hash size={16} className="text-[#7c3aed]" /> Ref:{' '}
              <code className="rounded bg-[#f5f3ff] px-2 py-0.5 text-xs">
                {String(response.submissionId).slice(0, 12)}
              </code>
            </li>
          </ul>
          <div className="mt-3 grid gap-2 text-xs text-[#64748b] sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5">
              <Mail size={12} /> Points refresh automatically from the navbar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} /> Check the Leaderboard to see your rank after approval
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-[#7c3aed]/30 bg-white px-5 py-3 font-bold text-[#6d28d9] shadow-sm transition hover:bg-[#f5f3ff]"
          >
            <ArrowLeft size={16} /> Back to Quiz Challenge
          </button>
          <button
            type="button"
            onClick={onLeaderboard}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
          >
            <Trophy size={18} /> See the Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  result,
  review,
  childName,
  quizTitle,
  alreadyCompleted,
  persisted,
  onLeaderboard,
}: {
  result: QuizResult;
  review: ReviewItem[];
  childName: string;
  quizTitle: string;
  alreadyCompleted: boolean;
  persisted: boolean;
  onLeaderboard: () => void;
}) {
  const mainReview = review.filter((r) => !r.isBonus);
  const bonusReview = review.filter((r) => r.isBonus);
  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] p-8 text-center text-white shadow-lg">
          <PartyPopper className="mx-auto" size={36} />
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
            {alreadyCompleted ? 'You already completed this quiz' : 'Quiz complete!'}
          </p>
          <p className="mt-1 text-5xl font-black">
            {result.score}/{result.total}
          </p>
          {result.bonusTotal ? (
            <p className="mt-1 text-amber-100">
              Bonus: {result.bonusScore}/{result.bonusTotal}
            </p>
          ) : null}
          {!persisted ? (
            <p className="mx-auto mt-3 max-w-sm rounded-xl bg-white/10 px-3 py-2 text-xs text-violet-100">
              Your score could not be saved to the leaderboard yet (the challenge tables are not set up).
            </p>
          ) : null}
        </div>

        {result.awardedBadge ? (
          <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 text-center shadow-lg">
            <Award className="mx-auto text-amber-500" size={40} />
            <h2 className="mt-2 text-2xl font-black text-amber-700">Certificate of Excellence</h2>
            <p className="mt-1 text-[#475569]">This certifies that</p>
            <p className="text-2xl font-black text-[#1e1b4b]">{childName}</p>
            <p className="mt-1 text-[#475569]">
              scored <span className="font-bold text-amber-700">{result.score}/{result.total}</span> in the{' '}
              {quizTitle}!
            </p>
            <p className="mt-3 inline-block rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-700">
              🏅 Digital Badge Earned
            </p>
          </div>
        ) : null}

        <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-6 shadow-lg">
          <h3 className="mb-3 text-lg font-black text-[#1e1b4b]">Correct answers</h3>
          <ul className="space-y-3">
            {[...mainReview, ...bonusReview].map((item, i) => (
              <li key={item.id} className="rounded-2xl border border-[#eee] bg-[#faf5ff] p-3">
                <div className="flex items-start gap-2">
                  {item.correct ? (
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={18} />
                  ) : (
                    <XCircle className="mt-0.5 shrink-0 text-rose-400" size={18} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1e1b4b]">
                      {i + 1}. {item.prompt} {item.isBonus ? <span className="text-amber-600">⭐</span> : null}
                    </p>
                    <p className="mt-1 text-sm text-[#475569]">
                      Your answer:{' '}
                      <span
                        className={
                          item.correct
                            ? 'font-semibold text-emerald-700'
                            : 'font-semibold text-rose-600'
                        }
                      >
                        {item.response || '(blank)'}
                      </span>
                    </p>
                    {!item.correct ? (
                      <p className="text-sm text-[#475569]">
                        Correct answer: <span className="font-semibold text-emerald-700">{item.answer}</span>
                      </p>
                    ) : null}
                    {item.explanation ? (
                      <p className="mt-1 text-xs text-[#64748b]">{item.explanation}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onLeaderboard}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
          >
            <Trophy size={18} /> See the Leaderboard
          </button>
          <Link
            href="/quiz-challenge"
            className="inline-flex items-center gap-2 rounded-xl border border-[#7c3aed]/30 bg-white px-5 py-3 font-bold text-[#6d28d9] shadow-sm transition hover:bg-[#f5f3ff]"
          >
            Back to Challenge
          </Link>
        </div>
      </div>
    </div>
  );
}
