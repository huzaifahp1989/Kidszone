'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Copy,
  Share2,
  Swords,
  Users,
  Trophy,
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type Role = 'creator' | 'opponent' | null;

type DuelView = {
  id: string;
  duelCode: string;
  status: string;
  difficulty: Difficulty;
  numQuestions: number;
  createdAt: string | null;
  expiresAt: string | null;
  finishedAt: string | null;
  creator: {
    id: string;
    name: string;
    submitted: boolean;
    correct: number | null;
    pointsAwarded: number | null;
  } | null;
  opponent: {
    id: string;
    name: string;
    submitted: boolean;
    correct: number | null;
    pointsAwarded: number | null;
  } | null;
  winnerId: string | null;
  isTie: boolean | null;
  viewerRole: Role;
};

type MyDuel = DuelView;

const STEPS = [
  'menu',
  'create-confirm',
  'waiting',
  'playing',
  'finished',
  'browse',
] as const;
type Step = (typeof STEPS)[number];

const DIFF_OPTS: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Simple surah & prophet facts' },
  { value: 'medium', label: 'Medium', hint: 'Quran events + verse context' },
  { value: 'hard', label: 'Hard', hint: 'Detailed references + Makki/Madani' },
  { value: 'mixed', label: 'Mixed', hint: 'All three levels shuffled' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function countDown(iso: string | null | undefined) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days >= 1) return `${days}d ${hrs}h left`;
  if (hrs >= 1) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

export default function QuranDuelPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [numQuestions, setNumQuestions] = useState(10);
  const [currentDuel, setCurrentDuel] = useState<DuelView | null>(null);
  const [viewerQuestions, setViewerQuestions] = useState<any[]>([]);
  const [viewerAnswers, setViewerAnswers] = useState<Record<string, number>>({});
  const [viewerShownFeedback, setViewerShownFeedback] = useState<Record<string, boolean>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myDuels, setMyDuels] = useState<MyDuel[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [startPlayTs, setStartPlayTs] = useState<number>(Date.now());
  const [lastResult, setLastResult] = useState<any>(null);
  const [tick, setTick] = useState(0);

  const codeFromUrl = useMemo(() => (params.get('code') || '').trim().toUpperCase(), [params]);
  const idFromUrl = useMemo(() => (params.get('id') || '').trim(), [params]);

  // tick for countdowns + waiting opponent
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  // Deep link: ?code=XXX  → open that duel
  useEffect(() => {
    if (!user || loading) return;
    if (codeFromUrl || idFromUrl) {
      void openDuelFromLink();
    }
  }, [codeFromUrl, idFromUrl, user, loading]);

  // Load my duels list once.
  useEffect(() => {
    if (!user) return;
    void loadMyDuels();
  }, [user]);

  async function loadMyDuels() {
    if (!user) return;
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(
        `/api/quran-duels/mine?userId=${encodeURIComponent(user.id)}&limit=50`,
        { headers }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.duels)) setMyDuels(json.duels);
    } catch {
      /* ignore */
    }
  }

  async function openDuelFromLink() {
    if (!user) {
      setErrorMsg('Sign in to join this duel challenge.');
      return;
    }
    const qp = new URLSearchParams();
    if (codeFromUrl) qp.set('duelCode', codeFromUrl);
    if (idFromUrl) qp.set('duelId', idFromUrl);
    qp.set('userId', user.id);
    const headers = await getAuthFetchHeaders();
    const res = await fetch(`/api/quran-duels/status?${qp.toString()}`, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorMsg(json.error || 'Could not open this duel.');
      return;
    }
    applyStatusResponse(json);
  }

  function applyStatusResponse(json: any) {
    setCurrentDuel(json.duel);
    setViewerQuestions(Array.isArray(json.viewerQuestions) ? json.viewerQuestions : []);
    setJoinCode(json.duel?.duelCode || '');
    const viewerRole: Role = json.duel?.viewerRole || null;
    const mySub = json.mySubmission;
    if (!viewerRole && json.duel?.status !== 'waiting') {
      setErrorMsg('This duel is already between two other players.');
      return;
    }
    if (json.duel?.status === 'finished') {
      setStep('finished');
      setLastResult({
        myScore: mySub ? { correct: mySub.correct, total: json.duel.numQuestions } : null,
        opponentScore: null,
      });
      return;
    }
    if (mySub?.submittedAt) {
      // They answered already, wait for opponent.
      setStep('waiting');
      return;
    }
    if (viewerQuestions.length > 0) {
      setViewerAnswers({});
      setViewerShownFeedback({});
      setCurrentQ(0);
      setStartPlayTs(Date.now());
      setStep('playing');
      return;
    }
    if (viewerRole === 'creator') {
      setStep('waiting');
      return;
    }
    // Opponent role but no opponent joined yet → prompt to join button
    setStep('create-confirm');
  }

  async function onCreateDuel() {
    if (!user) {
      setErrorMsg('Sign in first to start a duel challenge.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await authJsonFetch('/api/quran-duels/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: (profile as any)?.display_name || profile?.name || null,
          difficulty,
          numQuestions,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json.error || 'Could not create duel.');
        return;
      }
      setCurrentDuel(json.duel);
      setJoinCode(json.duel.duelCode);
      setStep('waiting');
      await loadMyDuels();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not create duel.');
    } finally {
      setBusy(false);
    }
  }

  async function onJoinDuel(code?: string) {
    if (!user) {
      setErrorMsg('Sign in first to join this duel.');
      return;
    }
    const duelCode = (code || joinCode).trim().toUpperCase();
    if (!duelCode || duelCode.length !== 6) {
      setErrorMsg('Enter the 6-letter share code from your friend.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await authJsonFetch('/api/quran-duels/join', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: (profile as any)?.display_name || profile?.name || null,
          duelCode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json.error || 'Could not join duel.');
        return;
      }
      setCurrentDuel(json.duel);
      setJoinCode(json.duel.duelCode);
      // After joining, fetch status which includes the questions for the opponent.
      const qp = new URLSearchParams();
      qp.set('duelId', json.duel.id);
      qp.set('userId', user.id);
      const headers = await getAuthFetchHeaders();
      const statusResp = await fetch(`/api/quran-duels/status?${qp.toString()}`, { headers });
      const statusJson = await statusResp.json().catch(() => ({}));
      if (statusResp.ok) applyStatusResponse(statusJson);
      else setStep('waiting');
      await loadMyDuels();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not join duel.');
    } finally {
      setBusy(false);
    }
  }

  async function refreshCurrentDuel() {
    if (!user || !currentDuel) return;
    const qp = new URLSearchParams();
    qp.set('duelId', currentDuel.id);
    qp.set('userId', user.id);
    const headers = await getAuthFetchHeaders();
    const statusResp = await fetch(`/api/quran-duels/status?${qp.toString()}`, { headers });
    const statusJson = await statusResp.json().catch(() => ({}));
    if (statusResp.ok) applyStatusResponse(statusJson);
  }

  function chooseOption(qid: string, index: number) {
    if (viewerShownFeedback[qid]) return;
    setViewerAnswers((prev) => ({ ...prev, [qid]: index }));
    setViewerShownFeedback((prev) => ({ ...prev, [qid]: true }));
  }

  function isFinalQuestion() {
    return currentQ >= Math.max(0, viewerQuestions.length - 1);
  }

  function advanceQuestion() {
    if (isFinalQuestion()) return;
    setCurrentQ((q) => q + 1);
  }

  async function finishSubmission() {
    if (!user || !currentDuel) return;
    setBusy(true);
    setErrorMsg(null);
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startPlayTs) / 1000));
    try {
      const res = await authJsonFetch('/api/quran-duels/submit', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          duelId: currentDuel.id,
          answers: viewerAnswers,
          durationSeconds,
        }),
        timeoutMs: 30_000,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json.error || 'Could not submit your answers.');
        setBusy(false);
        return;
      }
      setCurrentDuel(json.duel);
      setLastResult({
        myScore: json.myScore,
        opponentScore: json.opponentScore,
        grading: json.grading,
        winnerId: json.winnerId,
        isTie: json.isTie,
      });
      setStep('finished');
      await Promise.all([refreshProfile(), loadMyDuels()]);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not submit your answers.');
    } finally {
      setBusy(false);
    }
  }

  function copyShareLink() {
    if (!currentDuel?.duelCode) return;
    const url = `${window.location.origin}/quran-duel?code=${currentDuel.duelCode}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    } else {
      window.prompt('Copy this link:', url);
    }
  }

  async function nativeShare() {
    if (!currentDuel?.duelCode) return;
    const url = `${window.location.origin}/quran-duel?code=${currentDuel.duelCode}`;
    const title = 'Quran Duel challenge! 🕌⚔️';
    const text = `Challenge accepted? Take me on in a Quran quiz duel on Islamic Kids Learning Platform. Code: ${currentDuel.duelCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      /* fall through */
    }
    copyShareLink();
  }

  const amICreator = currentDuel?.viewerRole === 'creator';
  const amIOpponent = currentDuel?.viewerRole === 'opponent';

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-800">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-emerald-100">
              <Swords className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Quran Duels
              </h1>
              <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 sm:inline">
                1v1 Challenge
              </span>
            </div>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => {
                setStep('browse');
                void loadMyDuels();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              My duels
            </button>
          )}
        </header>

        {errorMsg && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
            {errorMsg}
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="ml-3 text-red-500 underline underline-offset-2"
            >
              Clear
            </button>
          </div>
        )}

        {!user && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-slate-700">
              Duels are between signed-in players.{' '}
              <Link
                href="/signin"
                className="font-bold text-emerald-700 underline underline-offset-2"
              >
                Sign in
              </Link>{' '}
              to challenge a friend or sibling.
            </p>
          </div>
        )}

        {step === 'menu' && user && (
          <MenuStep
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            numQuestions={numQuestions}
            setNumQuestions={setNumQuestions}
            onCreate={() => setStep('create-confirm')}
            onBrowse={() => setStep('browse')}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            onJoin={() => onJoinDuel()}
            busy={busy}
          />
        )}

        {step === 'create-confirm' && user && (
          <CreateConfirmStep
            duel={currentDuel}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            numQuestions={numQuestions}
            setNumQuestions={setNumQuestions}
            onCreate={onCreateDuel}
            onJoin={() => onJoinDuel()}
            onBack={() => setStep('menu')}
            busy={busy}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
          />
        )}

        {step === 'waiting' && user && currentDuel && (
          <WaitingStep
            duel={currentDuel}
            amICreator={amICreator}
            amIOpponent={amIOpponent}
            onRefresh={refreshCurrentDuel}
            onShare={nativeShare}
            onCopy={copyShareLink}
            onStartIfReady={() => openDuelFromLink()}
            tick={tick}
          />
        )}

        {step === 'playing' && user && (
          <PlayStep
            questions={viewerQuestions}
            answers={viewerAnswers}
            shownFeedback={viewerShownFeedback}
            currentQ={currentQ}
            onChoose={chooseOption}
            onAdvance={advanceQuestion}
            onFinish={finishSubmission}
            busy={busy}
            startTs={startPlayTs}
          />
        )}

        {step === 'finished' && user && currentDuel && (
          <FinishedStep
            duel={currentDuel}
            result={lastResult}
            me={user.id}
            onRematch={() => {
              setCurrentDuel(null);
              setLastResult(null);
              setStep('menu');
            }}
            onOpenMyDuels={() => {
              setStep('browse');
              void loadMyDuels();
            }}
          />
        )}

        {step === 'browse' && user && (
          <BrowseStep
            duels={myDuels}
            me={user.id}
            onRefresh={() => loadMyDuels()}
            onOpen={(duel) => {
              router.push(`/quran-duel?id=${duel.id}`);
              void (async () => {
                if (!user) return;
                const qp = new URLSearchParams();
                qp.set('duelId', duel.id);
                qp.set('userId', user.id);
                const headers = await getAuthFetchHeaders();
                const statusResp = await fetch(
                  `/api/quran-duels/status?${qp.toString()}`,
                  { headers }
                );
                const statusJson = await statusResp.json().catch(() => ({}));
                if (statusResp.ok) applyStatusResponse(statusJson);
              })();
            }}
            onBack={() => setStep('menu')}
          />
        )}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Duels expire after 7
            days. Winner by correct answers (tiebreaker: faster). Both players earn points.
          </span>
        </footer>
      </section>
    </main>
  );
}

function MenuStep(props: {
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  numQuestions: number;
  setNumQuestions: (n: number) => void;
  onCreate: () => void;
  onBrowse: () => void;
  joinCode: string;
  setJoinCode: (s: string) => void;
  onJoin: () => void;
  busy: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <Zap className="h-3.5 w-3.5" /> START A CHALLENGE
        </div>
        <h2 className="mb-2 text-lg font-black">Challenge a friend</h2>
        <p className="mb-4 text-sm text-slate-600">
          Set up a 1v1 Quran quiz. Send the 6-letter code to a sibling or classmate.
        </p>

        <div className="mb-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Difficulty
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DIFF_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => props.setDifficulty(opt.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  props.difficulty === opt.value
                    ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>Number of questions</span>
            <span className="text-emerald-700">{props.numQuestions}</span>
          </div>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={props.numQuestions}
            onChange={(e) => props.setNumQuestions(Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
          </div>
        </div>

        <button
          type="button"
          onClick={props.onCreate}
          disabled={props.busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 transition hover:brightness-105 disabled:opacity-60"
        >
          {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          Create duel challenge
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            <Play className="h-3.5 w-3.5" /> JOIN A FRIEND
          </div>
          <h2 className="mb-2 text-lg font-black">Got a share code?</h2>
          <p className="mb-3 text-sm text-slate-600">
            Paste the 6-letter code your friend sent you.
          </p>
          <input
            value={props.joinCode}
            onChange={(e) => props.setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="e.g. ABC789"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] uppercase text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={props.onJoin}
            disabled={props.busy || props.joinCode.length !== 6}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-sky-100 transition hover:bg-sky-700 disabled:opacity-60"
          >
            {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Join this duel
          </button>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <Trophy className="h-3.5 w-3.5" /> REWARDS
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Winner:{' '}
              <b>30 points + 1 badge</b>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-sky-500" /> Tie:{' '}
              <b>20 points each</b>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-amber-500" /> Participation:{' '}
              <b>10 points</b> just for playing
            </li>
          </ul>
          <button
            type="button"
            onClick={props.onBrowse}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
          >
            <Users className="h-4 w-4" /> View my recent duels
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateConfirmStep(props: {
  duel: DuelView | null;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  numQuestions: number;
  setNumQuestions: (n: number) => void;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
  busy: boolean;
  joinCode: string;
  setJoinCode: (s: string) => void;
}) {
  const isJoin = Boolean(props.duel && !props.duel.viewerRole && props.duel.status === 'waiting');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {isJoin ? 'Join a challenge' : 'Review & create'}
        </span>
      </div>

      {isJoin ? (
        <div className="space-y-3">
          <h2 className="text-xl font-black">You were invited to this duel</h2>
          <p className="text-sm text-slate-600">
            Code: <b className="font-mono">{props.duel?.duelCode}</b>. Created by{' '}
            <b>{props.duel?.creator?.name || 'Anonymous'}</b>.
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Difficulty
              </div>
              <div className="font-black capitalize">{props.duel?.difficulty}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Questions
              </div>
              <div className="font-black">{props.duel?.numQuestions}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Expires in
              </div>
              <div className="font-black">{countDown(props.duel?.expiresAt)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onJoin}
            disabled={props.busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 disabled:opacity-60"
          >
            {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Accept challenge &amp; start quiz
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-black">Create your duel</h2>
          <div className="mb-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Difficulty
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFF_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => props.setDifficulty(opt.value)}
                  className={`rounded-xl border px-3 py-2 text-center transition ${
                    props.difficulty === opt.value
                      ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Number of questions</span>
              <span className="text-emerald-700">{props.numQuestions}</span>
            </div>
            <input
              type="range"
              min={5}
              max={20}
              step={1}
              value={props.numQuestions}
              onChange={(e) => props.setNumQuestions(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
          <button
            type="button"
            onClick={props.onCreate}
            disabled={props.busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 disabled:opacity-60"
          >
            {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Generate duel code now
          </button>
        </div>
      )}
    </div>
  );
}

function WaitingStep(props: {
  duel: DuelView;
  amICreator: boolean;
  amIOpponent: boolean;
  onRefresh: () => void;
  onShare: () => void;
  onCopy: () => void;
  onStartIfReady: () => void;
  tick: number;
}) {
  const opponentJoined = !!props.duel.opponent;
  const bothDone = props.duel.creator?.submitted && props.duel.opponent?.submitted;
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        {opponentJoined ? <Clock className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {opponentJoined ? (bothDone ? 'Finalising results…' : 'Waiting for opponent answers') : 'Waiting for a challenger…'}
      </div>
      <h2 className="mb-1 text-xl font-black">
        Duel code:{' '}
        <span className="font-mono tracking-[0.35em] text-emerald-700">
          {props.duel.duelCode}
        </span>
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        {props.amICreator
          ? opponentJoined
            ? `${props.duel.opponent?.name || 'Challenger'} joined!`
            : 'Send this 6-letter code to a friend. Once they join, you both answer the same questions.'
          : opponentJoined
            ? `You joined this duel vs ${props.duel.creator?.name || 'Creator'}.`
            : 'Waiting for your opponent to accept.'}
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase text-slate-400">Difficulty</div>
          <div className="font-black capitalize">{props.duel.difficulty}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase text-slate-400">Questions</div>
          <div className="font-black">{props.duel.numQuestions}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase text-slate-400">Expires in</div>
          <div className="font-black">{countDown(props.duel.expiresAt)}</div>
        </div>
      </div>

      <div className="mb-5 flex items-stretch gap-2">
        <button
          type="button"
          onClick={props.onCopy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" /> Copy link
        </button>
        <button
          type="button"
          onClick={props.onShare}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button
          type="button"
          onClick={props.onRefresh}
          title="Refresh status"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PlayerCell
          title="You"
          name={props.amICreator ? props.duel.creator?.name : props.duel.opponent?.name || 'You'}
          submitted={props.amICreator ? !!props.duel.creator?.submitted : !!props.duel.opponent?.submitted}
          highlight
        />
        <PlayerCell
          title="Opponent"
          name={props.amICreator ? props.duel.opponent?.name : props.duel.creator?.name || 'Creator'}
          submitted={props.amICreator ? !!props.duel.opponent?.submitted : !!props.duel.creator?.submitted}
        />
      </div>
    </div>
  );
}

function PlayerCell(props: {
  title: string;
  name: string | undefined;
  submitted: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        props.highlight ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {props.title}
      </div>
      <div className="mb-1 font-black truncate">{props.name || 'Waiting…'}</div>
      <div
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
          props.submitted
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
        }`}
      >
        {props.submitted ? (
          <>
            <CheckCircle2 className="h-3 w-3" /> Answered
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" /> Not answered yet
          </>
        )}
      </div>
    </div>
  );
}

function PlayStep(props: {
  questions: any[];
  answers: Record<string, number>;
  shownFeedback: Record<string, boolean>;
  currentQ: number;
  onChoose: (qid: string, idx: number) => void;
  onAdvance: () => void;
  onFinish: () => void;
  busy: boolean;
  startTs: number;
}) {
  const q = props.questions[props.currentQ];
  const total = props.questions.length;
  const answeredCount = Object.keys(props.answers).length;
  const nowTick = useNowTick(1_000);
  const elapsedSec = Math.max(0, Math.floor((nowTick - props.startTs) / 1000));
  if (!q) return null;
  const chosen = props.answers[String(q.id)];
  const shown = !!props.shownFeedback[String(q.id)];
  const correctIndex = Number(q.__correct ?? -1); // We intentionally strip correct on the wire, so this is always -1 / unknown until grading.

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
          <Swords className="h-3.5 w-3.5" /> Question {props.currentQ + 1} of {total}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {answeredCount}/{total}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
            <Clock className="h-3.5 w-3.5" /> {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
          style={{ width: `${(answeredCount / Math.max(1, total)) * 100}%` }}
        />
      </div>

      {(q.surah || q.reference) && (
        <div className="mb-2 flex flex-wrap gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {q.surah && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Surah {q.surah}</span>}
          {q.reference && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{String(q.reference)}</span>}
        </div>
      )}
      {q.story && (
        <p className="mb-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm italic text-amber-900">
          {String(q.story)}
        </p>
      )}

      <h3 className="mb-4 text-lg font-black leading-snug sm:text-xl">
        {String(q.question)}
      </h3>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {(Array.isArray(q.options) ? q.options : []).map((opt: string, idx: number) => {
          const isChosen = chosen === idx && shown;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => props.onChoose(String(q.id), idx)}
              disabled={shown}
              className={`rounded-xl border-2 px-4 py-3 text-left font-semibold transition ${
                shown && isChosen
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                  : shown
                    ? 'border-slate-200 bg-white text-slate-600'
                    : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40'
              } disabled:cursor-default`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{String(opt)}</span>
                {shown && isChosen && (
                  <CheckCircle2 className="ml-auto mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {shown && (q.explanation || q.didYouKnow) && (
        <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-900">
          {q.explanation && (
            <p className="mb-1">
              <b>Explanation:</b> {String(q.explanation)}
            </p>
          )}
          {q.didYouKnow && (
            <p>
              <b>Did you know?</b> {String(q.didYouKnow)}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!shown && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            Click an answer A–{String.fromCharCode(65 + (Array.isArray(q.options) ? q.options.length - 1 : 0))} to continue.
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {!isLastQ(props.currentQ, total) || !shown ? null : (
            <button
              type="button"
              onClick={props.onFinish}
              disabled={props.busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 disabled:opacity-60"
            >
              {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              Submit duel &amp; view results
            </button>
          )}
          {shown && !isLastQ(props.currentQ, total) && (
            <button
              type="button"
              onClick={props.onAdvance}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
            >
              Next question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function isLastQ(current: number, total: number) {
  return current >= Math.max(0, total - 1);
}

function useNowTick(ms: number) {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

function FinishedStep(props: {
  duel: DuelView;
  result: any;
  me: string;
  onRematch: () => void;
  onOpenMyDuels: () => void;
}) {
  const { duel, result, me } = props;
  const myCorrect = result?.myScore?.correct ?? null;
  const oppCorrect = result?.opponentScore?.correct ?? null;
  const total = result?.myScore?.total ?? duel.numQuestions;

  const myFinalScore = duel.viewerRole === 'creator' ? duel.creator?.correct : duel.opponent?.correct;
  const oppFinalScore = duel.viewerRole === 'creator' ? duel.opponent?.correct : duel.creator?.correct;
  const myPts = duel.viewerRole === 'creator' ? duel.creator?.pointsAwarded : duel.opponent?.pointsAwarded;
  const oppPts = duel.viewerRole === 'creator' ? duel.opponent?.pointsAwarded : duel.creator?.pointsAwarded;

  const didIWin = duel.winnerId === me;
  const tied = !!duel.isTie;
  const lost = !didIWin && !tied && duel.winnerId != null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
              didIWin
                ? 'bg-emerald-100 text-emerald-800'
                : tied
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            {didIWin ? 'You won the duel!' : tied ? "It's a tie" : lost ? 'Opponent won' : 'Results'}
          </div>
          <h2 className="text-xl font-black">
            Duel <span className="font-mono">{duel.duelCode}</span> complete
          </h2>
          <p className="text-sm text-slate-600">Finished on {formatDate(duel.finishedAt)}</p>
        </div>
        <div className="grid w-28 grid-cols-3 gap-1 text-[10px] font-black uppercase text-slate-400">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div>W</div>
            <div className="mt-0.5 text-sm text-emerald-700">
              {didIWin ? '1' : '0'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div>T</div>
            <div className="mt-0.5 text-sm text-amber-700">
              {tied ? '1' : '0'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div>L</div>
            <div className="mt-0.5 text-sm text-rose-700">
              {lost ? '1' : '0'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <ScoreCell
          label="You"
          name={
            (duel.viewerRole === 'creator' ? duel.creator?.name : duel.opponent?.name) ||
            'You'
          }
          score={myFinalScore ?? myCorrect ?? null}
          total={total}
          points={myPts ?? null}
          highlight
          winner={didIWin}
        />
        <ScoreCell
          label="Opponent"
          name={
            (duel.viewerRole === 'creator' ? duel.opponent?.name : duel.creator?.name) ||
            'Challenger'
          }
          score={oppFinalScore ?? oppCorrect ?? null}
          total={total}
          points={oppPts ?? null}
          winner={!tied && !didIWin && duel.winnerId != null}
        />
      </div>

      {result?.grading && (
        <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer font-bold">Review my answers</summary>
          <div className="mt-3 space-y-2">
            {Object.entries<any>(result.grading).map(([qid, g]) => (
              <div
                key={qid}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  g.correct
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">Q {qid.slice(0, 8)}</span>
                  {g.correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-700" />
                  )}
                </div>
                <div className="text-xs">
                  Chosen: {g.chosen >= 0 ? String.fromCharCode(65 + g.chosen) : '-'} · Correct:{' '}
                  {String.fromCharCode(65 + g.correctIndex)}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={props.onRematch}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 hover:brightness-105"
        >
          <RefreshCw className="h-4 w-4" /> Rematch · new challenge
        </button>
        <button
          type="button"
          onClick={props.onOpenMyDuels}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
        >
          <Users className="h-4 w-4" /> All my duels
        </button>
      </div>
    </div>
  );
}

function ScoreCell(props: {
  label: string;
  name: string;
  score: number | null;
  total: number;
  points: number | null;
  highlight?: boolean;
  winner?: boolean;
}) {
  const pct = props.total > 0 && props.score != null ? (props.score / props.total) * 100 : 0;
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        props.highlight ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
      } ${props.winner ? 'ring-2 ring-amber-200' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {props.label}
        </span>
        {props.winner && (
          <span title="Winner" className="text-amber-600">
            <Trophy className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mb-2 truncate font-black">{props.name}</div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-3xl font-black text-slate-900">
          {props.score ?? '-'}
        </span>
        <span className="text-sm font-bold text-slate-500">/ {props.total}</span>
        <span className="ml-auto text-xs font-black text-emerald-700">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">Points awarded</span>
        <span className="font-black text-amber-700">+{props.points ?? 0}</span>
      </div>
    </div>
  );
}

function BrowseStep(props: {
  duels: MyDuel[];
  me: string;
  onRefresh: () => void;
  onOpen: (d: MyDuel) => void;
  onBack: () => void;
}) {
  const active = props.duels.filter((d) => d.status !== 'finished' && d.status !== 'expired' && d.status !== 'cancelled');
  const done = props.duels.filter((d) => d.status === 'finished' || d.status === 'expired' || d.status === 'cancelled');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={props.onBack}
            className="mb-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to duel menu
          </button>
          <h2 className="text-xl font-black">My duels</h2>
        </div>
        <button
          type="button"
          onClick={props.onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {!props.duels.length && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          You haven&rsquo;t played any duels yet. Go back and challenge a friend!
        </div>
      )}

      {!!active.length && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-emerald-700">
            In progress ({active.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((d) => (
              <DuelCard key={d.id} duel={d} me={props.me} onOpen={props.onOpen} />
            ))}
          </div>
        </div>
      )}

      {!!done.length && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            History ({done.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((d) => (
              <DuelCard key={d.id} duel={d} me={props.me} onOpen={props.onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DuelCard(props: { duel: MyDuel; me: string; onOpen: (d: MyDuel) => void }) {
  const d = props.duel;
  const myName = d.viewerRole === 'creator' ? d.creator?.name : d.opponent?.name;
  const oppName = d.viewerRole === 'creator' ? d.opponent?.name : d.creator?.name;
  const myScore = d.viewerRole === 'creator' ? d.creator?.correct : d.opponent?.correct;
  const oppScore = d.viewerRole === 'creator' ? d.opponent?.correct : d.creator?.correct;
  const statusBadge = (() => {
    switch (d.status) {
      case 'waiting':
        return { cls: 'bg-sky-100 text-sky-700', text: 'Waiting' };
      case 'in_progress':
        return { cls: 'bg-amber-100 text-amber-700', text: 'Playing' };
      case 'finished':
        return d.winnerId === props.me
          ? { cls: 'bg-emerald-100 text-emerald-700', text: 'Win' }
          : d.isTie
            ? { cls: 'bg-amber-100 text-amber-700', text: 'Tie' }
            : { cls: 'bg-rose-100 text-rose-700', text: 'Loss' };
      case 'expired':
        return { cls: 'bg-slate-100 text-slate-600', text: 'Expired' };
      default:
        return { cls: 'bg-slate-100 text-slate-600', text: d.status };
    }
  })();
  return (
    <button
      type="button"
      onClick={() => props.onOpen(d)}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-black tracking-widest text-slate-800">
          {d.duelCode}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase ${statusBadge.cls}`}>
          {statusBadge.text}
        </span>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 capitalize">
          {d.difficulty}
        </span>
        <span className="text-slate-500">{d.numQuestions} Qs</span>
      </div>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-black">{myName || 'You'}</span>
        <span className="font-mono font-black text-slate-700">
          {myScore ?? '-'} : {oppScore ?? '-'}
        </span>
        <span className="truncate text-right font-bold text-slate-600">{oppName || 'Challenger'}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{formatDate(d.createdAt)}</span>
        {d.status !== 'finished' ? (
          <span>{countDown(d.expiresAt)}</span>
        ) : (
          <span>{formatDate(d.finishedAt)}</span>
        )}
      </div>
    </button>
  );
}
