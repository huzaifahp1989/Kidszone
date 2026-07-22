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
} from 'lucide-react';

interface QuizMeta {
  key: string;
  title: string;
  emoji: string;
  description: string;
  passScore: number;
  awardsBadge: boolean;
  timerSeconds: number;
  mainCount: number;
  bonusCount: number;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  isBonus: boolean;
  points: number;
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

const ENCOURAGEMENTS = [
  'MashaAllah, great effort! 🌟',
  'Well done — keep going! 💪',
  'Nice try! On to the next one. ✨',
  'You are doing brilliantly! 🌙',
  'Keep it up, little scholar! 📖',
  'Barakallahu feek! 🤲',
];

type Phase = 'loading' | 'signin' | 'intro' | 'playing' | 'submitting' | 'done' | 'completed';

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

  const startRef = React.useRef<number>(0);
  const submittedRef = React.useRef(false);
  const answersRef = React.useRef<Record<string, string>>({});
  answersRef.current = answers;

  const validKey = isChallengeQuizKey(quizKey);

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

  const submitQuiz = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current || !meta || !user) return;
      submittedRef.current = true;
      setPhase('submitting');

      // Make sure the currently typed answer is captured.
      const finalAnswers = { ...answersRef.current };
      const q = questions[index];
      if (q && current.trim()) finalAnswers[q.id] = current.trim();

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
    [meta, user, questions, index, current, quizKey]
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
    setCurrent('');
    setPhase('playing');
  };

  const goNext = () => {
    const q = questions[index];
    if (!q) return;
    const updated = { ...answersRef.current, [q.id]: current.trim() };
    setAnswers(updated);
    setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);

    if (index + 1 >= questions.length) {
      submitQuiz(false);
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

  if (phase === 'intro' && meta) {
    return (
      <CenterCard>
        <div className="text-5xl">{meta.emoji}</div>
        <h1 className="mt-2 text-3xl font-black text-[#1e1b4b]">{meta.title}</h1>
        <p className="mt-2 text-[#475569]">{meta.description}</p>
        <div className="mt-4 grid gap-2 text-left text-sm text-[#5b21b6]">
          <p className="flex items-center gap-2"><Clock size={16} /> You have {Math.round(meta.timerSeconds / 60)} minutes.</p>
          <p className="flex items-center gap-2"><CheckCircle2 size={16} /> {meta.mainCount} questions + {meta.bonusCount} bonus.</p>
          <p className="flex items-center gap-2"><Award size={16} /> Type your answers. Small spelling slips are okay!</p>
          <p className="flex items-center gap-2"><Trophy size={16} /> One attempt only — give it your best!</p>
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
        <p className="mt-3 font-semibold text-[#475569]">Marking your answers…</p>
      </CenterCard>
    );
  }

  // phase === 'playing'
  const q = questions[index];
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
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black tabular-nums ${
              lowTime ? 'bg-rose-100 text-rose-700' : 'bg-white text-[#6d28d9] shadow-sm'
            }`}
            aria-label="Time remaining"
          >
            <Clock size={15} /> {formatTime(remaining)}
          </span>
        </div>

        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#6d28d9]">
          <span>Question {index + 1} of {total}</span>
          {q?.isBonus ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">⭐ Bonus</span>
          ) : null}
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
          <p className="text-xl font-bold leading-8 text-[#1e1b4b] md:text-2xl">{q?.prompt}</p>
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
          {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#c4b5fd]/60 bg-white px-4 py-2.5 font-bold text-[#6d28d9] transition hover:bg-[#f5f3ff] disabled:opacity-40"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-5 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              {isLast ? 'Finish Quiz' : 'Next Question'} <ArrowRight size={16} />
            </button>
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
            <p className="mt-1 text-amber-100">Bonus: {result.bonusScore}/{result.bonusTotal}</p>
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
              scored <span className="font-bold text-amber-700">{result.score}/{result.total}</span> in the {quizTitle}!
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
                      <span className={item.correct ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-600'}>
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
