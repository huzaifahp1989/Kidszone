'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeft, RotateCcw, VolumeX } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import {
  getTawafProgress,
  TAWAF_LAPS,
} from '@/lib/virtual-hajj-gameplay';
import type { VirtualHajjQuestion } from '@/lib/virtual-hajj-challenges';

const ThreeTawafScene = dynamic(() => import('./three-tawaf-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-sky-100 text-blue-900">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
        <p className="font-bold">Preparing the 3D courtyard…</p>
      </div>
    </div>
  ),
});

type ChallengeState = {
  challengeKey: string;
  questions: VirtualHajjQuestion[];
  attemptsUsed: number;
  attemptsRemaining: number;
  completed: boolean;
  pointsAwarded: number;
  nextLevelUnlocked: boolean;
  achievementUnlocked: boolean;
  profile: {
    totalPoints: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  } | null;
};

type Phase = 'loading' | 'intro' | 'playing' | 'paused' | 'quiz' | 'complete' | 'error';

const EDUCATION_CARDS = [
  {
    title: 'The Kaaba',
    text: 'Quran 2:125 describes the House as a place of return and safety for people. Muslims around the world face towards al-Masjid al-Haram for prayer.',
    reference: 'Quran 2:125 and 2:144',
  },
  {
    title: 'Tawaf',
    text: 'Quran 22:29 mentions circumambulating the Ancient House. This game marks a counter-clockwise learning route; ask a qualified teacher about the rites and their details.',
    reference: 'Quran 22:29',
  },
];

export default function VirtualHajjWorldPage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(() => getTawafProgress(0));
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [joy, setJoy] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef({ forward: 0, turn: 0 });

  const loadChallenge = useCallback(async () => {
    if (authLoading) return;
    if (!user?.id) {
      setError('Please sign in to load your challenge and save your points.');
      setPhase('error');
      return;
    }
    setError('');
    try {
      const response = await authJsonFetch(
        `/api/games/virtual-hajj?userId=${encodeURIComponent(user.id)}`,
        { method: 'GET' }
      );
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Challenge progress could not be loaded.');
      }
      setChallenge(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Challenge progress could not be loaded.');
      setPhase('error');
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  const handleSceneReady = useCallback(() => {
    setPhase((current) => (current === 'loading' ? 'intro' : current));
  }, []);

  const handleSceneError = useCallback((message: string) => {
    setError(message);
    setPhase('error');
  }, []);

  const handleProgress = useCallback((next: ReturnType<typeof getTawafProgress>) => {
    setProgress(next);
  }, []);

  const handleLapComplete = useCallback(() => {
    controlRef.current = { forward: 0, turn: 0 };
    setPhase('quiz');
  }, []);

  const updateJoystick = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    const radius = Math.hypot(x, y);
    const scale = radius > 1 ? 1 / radius : 1;
    const normalizedX = x * scale;
    const normalizedY = y * scale;
    setJoy({ x: normalizedX * 32, y: normalizedY * 32 });
    controlRef.current = {
      forward: Math.max(0, -normalizedY),
      turn: normalizedX,
    };
  };

  const releaseJoystick = () => {
    setJoy({ x: 0, y: 0 });
    controlRef.current = { forward: 0, turn: 0 };
  };

  const submitChallenge = async () => {
    if (!user?.id || !challenge || sending) return;
    setSending(true);
    setFeedback('');
    try {
      const response = await authJsonFetch('/api/games/virtual-hajj', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          challengeKey: challenge.challengeKey,
          answers,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Your answers could not be saved.');

      setChallenge((current) =>
        current
          ? {
              ...current,
              attemptsUsed: result.attemptsUsed,
              attemptsRemaining: result.attemptsRemaining,
              completed: Boolean(result.correct || result.alreadyCompleted),
              pointsAwarded: result.pointsAwarded,
              nextLevelUnlocked: Boolean(result.nextLevelUnlocked),
              achievementUnlocked: Boolean(result.achievementUnlocked),
              profile: result.profile ?? current.profile,
            }
          : current
      );

      if (result.correct || result.alreadyCompleted) {
        void refreshProfile();
        setFeedback(
          result.alreadyCompleted
            ? 'You already completed today’s challenge. Your earlier reward is safe.'
            : `Great learning! ${result.pointsAwarded > 0 ? `You earned ${result.pointsAwarded} points.` : 'Your daily points cap has been reached.'}`
        );
        setPhase('complete');
      } else if (result.attemptsRemaining > 0) {
        setFeedback(`Not quite yet. Review the learning notes and try again. ${result.attemptsRemaining} attempts remain today.`);
      } else {
        setFeedback('That was the last attempt for today. Read the notes and return tomorrow for a fresh challenge.');
      }
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Your answers could not be saved.');
    } finally {
      setSending(false);
    }
  };

  const restartRoute = () => {
    controlRef.current = { forward: 0, turn: 0 };
    setJoy({ x: 0, y: 0 });
    setProgress(getTawafProgress(0));
    setPhase('intro');
    setResetToken((current) => current + 1);
  };

  const progressPercent = (progress.radians / (Math.PI * 2 * TAWAF_LAPS)) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-3 py-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/games/hajj"
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-2 font-bold text-blue-800 hover:bg-blue-100"
        >
          <ArrowLeft size={18} /> Hajj Learning Games
        </Link>

        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Interactive 3D lesson</p>
            <h1 className="text-3xl font-black text-blue-950 sm:text-4xl">Explore the Kaaba courtyard</h1>
            <p className="mt-1 text-sm text-slate-600">A learning activity about Tawaf, not a religious rite.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
            <VolumeX size={17} aria-hidden="true" /> No music or sound
          </div>
          {challenge?.profile && (
            <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-950">
              Points: {challenge.profile.totalPoints}
            </div>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section
            className="relative isolate h-[62vh] min-h-[440px] overflow-hidden rounded-[2rem] border-4 border-white bg-sky-100 shadow-xl sm:h-[68vh] sm:min-h-[540px]"
            aria-label="Virtual Hajj learning game"
          >
            <ThreeTawafScene
              active={phase === 'playing'}
              controls={controlRef.current}
              resetToken={resetToken}
              onReady={handleSceneReady}
              onError={handleSceneError}
              onProgress={handleProgress}
              onComplete={handleLapComplete}
            />

            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
              <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Tawaf learning route</p>
                <p className="text-lg font-black text-blue-950">
                  Lap {Math.min(progress.laps + (progress.complete ? 0 : 1), TAWAF_LAPS)} of {TAWAF_LAPS}
                  <span className="ml-2 text-sm font-bold text-slate-600">
                    · Checkpoint {progress.complete ? 7 : progress.checkpointsInLap} / 7
                  </span>
                </p>
                <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-blue-100 sm:w-56">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="pointer-events-auto flex gap-2">
                {(phase === 'playing' || phase === 'paused') && (
                  <button
                    type="button"
                    onClick={() => {
                      controlRef.current = { forward: 0, turn: 0 };
                      setJoy({ x: 0, y: 0 });
                      setPhase(phase === 'playing' ? 'paused' : 'playing');
                    }}
                    className="rounded-xl bg-white px-4 py-3 font-extrabold text-blue-900 shadow-lg"
                  >
                    {phase === 'playing' ? 'Pause' : 'Resume'}
                  </button>
                )}
                {(phase === 'complete' || phase === 'quiz' || phase === 'error') && (
                  <button
                    type="button"
                    onClick={restartRoute}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-extrabold text-blue-900 shadow-lg"
                  >
                    <RotateCcw size={16} /> Restart
                  </button>
                )}
              </div>
            </div>

            {phase === 'loading' && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-sky-50/90 p-6 text-center">
                <div>
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
                  <p className="font-bold text-blue-900">Loading your learning challenge…</p>
                </div>
              </div>
            )}

            {phase === 'intro' && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-[2px] sm:p-8">
                <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-8">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Before you begin</p>
                  <h2 className="mt-1 text-2xl font-black text-blue-950">Explore the learning route</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    Walk the marked counter-clockwise path around this educational model. Pass seven checkpoints per
                    lap for seven laps, then answer the knowledge challenge.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {EDUCATION_CARDS.map((card) => (
                      <article key={card.title} className="rounded-2xl bg-blue-50 p-3">
                        <h3 className="font-extrabold text-blue-950">{card.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-700">{card.text}</p>
                        <p className="mt-2 text-[11px] font-bold text-blue-700">{card.reference}</p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                    This game does not fulfil Hajj or Umrah and does not teach every rite. Content is for learning and
                    requires review by a qualified Islamic teacher before religious use.
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">WASD / ↑ to walk · drag the view or use the joystick</p>
                    <button
                      type="button"
                      disabled={!challenge || authLoading}
                      onClick={() => setPhase('playing')}
                      className="rounded-full bg-blue-700 px-6 py-3 font-black text-white shadow-lg hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {!challenge || authLoading ? 'Loading challenge…' : 'Start exploring'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'playing' && (
              <>
                <div
                  ref={joystickRef}
                  role="application"
                  aria-label="Virtual joystick: move up to walk and left or right to rotate the camera"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updateJoystick(event);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) updateJoystick(event);
                  }}
                  onPointerUp={releaseJoystick}
                  onPointerCancel={releaseJoystick}
                  className="absolute bottom-4 left-4 z-10 grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/90 bg-slate-900/25 shadow-lg sm:bottom-6 sm:left-6 sm:h-32 sm:w-32"
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-blue-700 shadow-lg"
                    style={{ transform: `translate(${joy.x}px, ${joy.y}px)` }}
                  >
                    <span className="text-xl font-black text-white">+</span>
                  </div>
                  <span className="absolute -bottom-6 whitespace-nowrap text-xs font-bold text-white drop-shadow">
                    Walk · rotate view
                  </span>
                </div>
                <div className="pointer-events-none absolute bottom-5 right-4 rounded-xl bg-slate-950/60 px-3 py-2 text-xs font-bold text-white sm:bottom-7 sm:right-6">
                  Drag the courtyard to look around
                </div>
              </>
            )}

            {phase === 'paused' && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/30 p-5 backdrop-blur-sm">
                <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
                  <h2 className="text-2xl font-black text-blue-950">Paused</h2>
                  <p className="mt-2 text-slate-600">Your route progress will remain here while paused.</p>
                  <button
                    type="button"
                    onClick={() => setPhase('playing')}
                    className="mt-5 rounded-full bg-blue-700 px-6 py-3 font-black text-white"
                  >
                    Resume walking
                  </button>
                </div>
              </div>
            )}

            {phase === 'quiz' && (
              <div className="absolute inset-0 z-20 overflow-y-auto bg-white/95 p-4 backdrop-blur-sm sm:p-7">
                <div className="mx-auto max-w-xl">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Route complete</p>
                  <h2 className="text-2xl font-black text-blue-950">Daily knowledge challenge</h2>
                  <p className="mt-1 text-sm text-slate-600">Answer all questions correctly to earn the one-time daily reward.</p>
                  {!challenge && (
                    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      {error || 'Loading challenge questions…'}
                    </p>
                  )}
                  {challenge?.completed ? (
                    <div className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">
                      You completed today’s challenge and earned {challenge.pointsAwarded} points.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {challenge?.questions.map((question, index) => (
                        <fieldset key={question.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                          <legend className="px-1 font-extrabold text-slate-900">
                            {index + 1}. {question.prompt}
                          </legend>
                          <div className="mt-2 space-y-2">
                            {question.options.map((option) => (
                              <label key={option.id} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option.id}
                                  checked={answers[question.id] === option.id}
                                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                                  className="mt-1 accent-blue-700"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                          <p className="mt-2 text-xs font-bold text-blue-700">Read more: {question.reference}</p>
                        </fieldset>
                      ))}
                      {challenge && challenge.attemptsRemaining > 0 && (
                        <button
                          type="button"
                          disabled={sending || Object.keys(answers).length !== challenge.questions.length}
                          onClick={() => void submitChallenge()}
                          className="w-full rounded-full bg-blue-700 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {sending ? 'Checking answers…' : 'Submit answers'}
                        </button>
                      )}
                    </div>
                  )}
                  {feedback && (
                    <p aria-live="polite" className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-950">
                      {feedback}
                    </p>
                  )}
                </div>
              </div>
            )}

            {phase === 'complete' && (
              <div className="absolute inset-0 z-20 overflow-y-auto bg-white/95 p-4 backdrop-blur-sm sm:p-7">
                <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-5 text-center shadow-xl sm:p-8">
                  <div className="text-5xl" aria-hidden="true">🏅</div>
                  <h2 className="mt-2 text-2xl font-black text-emerald-900">Learning challenge complete!</h2>
                  <p className="mt-2 font-bold text-slate-700">{feedback}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Reward claims are saved to your account and cannot be repeated for today’s challenge.
                  </p>
                  <div className="mt-4 space-y-2 text-left">
                    {challenge?.questions.map((question) => (
                      <article key={question.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-sm font-extrabold text-slate-900">{question.prompt}</p>
                        <p className="mt-1 text-sm text-slate-700">{question.explanation}</p>
                        <p className="mt-1 text-xs font-bold text-blue-700">{question.reference}</p>
                      </article>
                    ))}
                  </div>
                  {challenge?.achievementUnlocked && (
                    <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left">
                      <p className="font-black text-amber-950">🏅 Tawaf Learner achievement unlocked</p>
                      <p className="mt-1 text-sm text-amber-900">
                        This account achievement is saved and is not re-awarded for repeating the lesson.
                      </p>
                    </div>
                  )}
                  {challenge?.nextLevelUnlocked && (
                    <article className="mt-5 rounded-2xl bg-blue-50 p-4 text-left">
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">Next lesson unlocked</p>
                      <h3 className="mt-1 text-lg font-black text-blue-950">Safa and Marwah</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        Quran 2:158 mentions as-Safa and al-Marwah among the symbols of Allah. This next learning card
                        introduces the verse; consult a qualified teacher for the rites and their details.
                      </p>
                      <p className="mt-2 text-xs font-bold text-blue-700">Reference: Quran 2:158</p>
                    </article>
                  )}
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={restartRoute}
                      className="rounded-full bg-blue-700 px-6 py-3 font-black text-white"
                    >
                      Explore again
                    </button>
                    <Link href="/games/hajj" className="rounded-full bg-slate-100 px-6 py-3 font-black text-slate-800">
                      Back to Hajj games
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white/95 p-5 text-center backdrop-blur-sm">
                <div className="max-w-md rounded-3xl bg-white p-7 shadow-xl">
                  <h2 className="text-2xl font-black text-blue-950">We could not start the 3D lesson</h2>
                  <p className="mt-3 text-sm text-slate-700">{error || 'Please check your connection and try again.'}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('loading');
                        setError('');
                        void loadChallenge();
                        setResetToken((current) => current + 1);
                      }}
                      className="rounded-full bg-blue-700 px-5 py-3 font-black text-white"
                    >
                      Retry
                    </button>
                    <Link
                      href="/games/hajj/tawaf"
                      className="rounded-full bg-slate-100 px-5 py-3 font-black text-slate-800"
                    >
                      Open 2D Tawaf
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-blue-950">How to move</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                <li><strong>Touch:</strong> drag the joystick up to walk; move it sideways to rotate the view.</li>
                <li><strong>Keyboard:</strong> hold W or ↑ to walk; A/D or ←/→ rotate the camera.</li>
                <li><strong>Look:</strong> drag the 3D courtyard to rotate the camera. Pause any time.</li>
              </ul>
            </article>
            <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-black text-amber-950">Learning, not worship</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-950">
                This educational model is not an exact architectural replica and playing it does not fulfil Hajj or
                Umrah. Religious content must be reviewed by a qualified Islamic teacher before release.
              </p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="font-black text-slate-900">Daily progress</h2>
              <p className="mt-2 text-sm text-slate-600">
                {challenge
                  ? `${challenge.attemptsRemaining} of 5 challenge attempts remain today.`
                  : 'Sign in and connect to load your saved challenge progress.'}
              </p>
              <p className="mt-2 text-xs text-slate-500">Points are awarded only for server-checked answers, once per day.</p>
            </article>
            {challenge?.nextLevelUnlocked && phase !== 'complete' && (
              <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Unlocked lesson</p>
                <h2 className="mt-1 font-black text-emerald-950">Safa and Marwah</h2>
                <p className="mt-2 text-sm leading-relaxed text-emerald-950">
                  Quran 2:158 names as-Safa and al-Marwah among the symbols of Allah. Ask a qualified teacher about
                  the rites and their details.
                </p>
                <p className="mt-2 text-xs font-bold text-emerald-800">Reference: Quran 2:158</p>
              </article>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
