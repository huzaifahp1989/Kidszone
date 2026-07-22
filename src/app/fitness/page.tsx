'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders, authJsonFetch } from '@/lib/auth-headers';
import { nativeStepsSupported, readNativeSteps, requestStepPermission } from '@/lib/step-source';
import { usePedometer } from '@/lib/pedometer';
import { Footprints, Flame, MapPin, Clock, Trophy, Star, Loader2, RefreshCw, CheckCircle2, PartyPopper, Award, Play, Square } from 'lucide-react';

interface FitnessStatus {
  challenge: { id: string; name: string; goalType: 'steps' | 'minutes'; goalTarget: number; points: number } | null;
  today: { steps: number; minutes: number; distanceM: number; calories: number; goalMet: boolean; pointsAwarded: number };
  currentStreak: number;
  weekSteps: number;
  monthSteps: number;
  lifetimeSteps: number;
  totalPoints: number;
  badges: string[];
  achievements: { key: string; label: string; emoji: string; earned: boolean }[];
  tableMissing?: boolean;
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${tint}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
        {icon} {label}
      </div>
      <p className="mt-1 text-2xl font-black text-[#1e1b4b]">{value}</p>
    </div>
  );
}

export default function FitnessPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = React.useState<FitnessStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [nativeSupported, setNativeSupported] = React.useState(false);
  const [justCompleted, setJustCompleted] = React.useState(false);

  // In-app step counter (accelerometer) — works while this page is open.
  const pedometer = usePedometer();
  const baseStepsRef = React.useRef(0);
  const liveStepsRef = React.useRef(0);
  liveStepsRef.current = pedometer.steps;

  const pushSteps = React.useCallback(async (total: number, source: string) => {
    try {
      const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/fitness/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ steps: Math.round(total), source }),
      });
      const json = await res.json();
      if (res.ok && json.status) {
        setStatus(json.status as FitnessStatus);
        if (json.newlyAwardedPoints > 0) {
          setJustCompleted(true);
          setMessage(`MashaAllah! +${json.newlyAwardedPoints} points for completing today\u2019s challenge!`);
        }
      }
    } catch {
      /* offline — will sync on the next tick */
    }
  }, []);

  const startCounter = React.useCallback(async () => {
    baseStepsRef.current = status?.today.steps ?? 0;
    pedometer.reset();
    await pedometer.start();
  }, [pedometer, status?.today.steps]);

  const stopCounter = React.useCallback(async () => {
    pedometer.stop();
    await pushSteps(baseStepsRef.current + liveStepsRef.current, 'device_motion');
  }, [pedometer, pushSteps]);

  // While counting, sync every 15s so progress + points update live.
  React.useEffect(() => {
    if (!pedometer.running) return;
    const id = window.setInterval(() => {
      pushSteps(baseStepsRef.current + liveStepsRef.current, 'device_motion');
    }, 15000);
    return () => window.clearInterval(id);
  }, [pedometer.running, pushSteps]);

  const loadStatus = React.useCallback(async () => {
    try {
      const res = await authJsonFetch('/api/fitness/status');
      const json = await res.json();
      if (res.ok) setStatus(json as FitnessStatus);
      else setError(json?.error || 'Could not load your activity.');
    } catch {
      setError('Could not load your activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = React.useCallback(async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const reading = await readNativeSteps();
      if (!reading) {
        setError('Connect your phone\u2019s health app to track steps automatically.');
        return;
      }
      const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/fitness/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ steps: reading.steps, minutes: reading.minutes, source: reading.source }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Sync failed');
      if (json.status) setStatus(json.status as FitnessStatus);
      if (json.newlyAwardedPoints > 0 || json.goalMet) setJustCompleted(true);
      if (json.newlyAwardedPoints > 0) setMessage(`MashaAllah! +${json.newlyAwardedPoints} points for completing today\u2019s challenge!`);
      else setMessage('Steps synced!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }
    const supported = nativeStepsSupported();
    setNativeSupported(supported);
    loadStatus();
    if (supported) {
      requestStepPermission().then(() => sync());
    }
  }, [authLoading, user, loadStatus, sync]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto animate-spin text-[#7c3aed]" size={32} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="rounded-3xl border border-amber-300 bg-amber-50 p-8 text-center">
            <Footprints className="mx-auto text-amber-500" size={36} />
            <p className="mt-2 font-bold text-amber-800">Sign in to join the Fitness Challenge</p>
            <Link href="/signin?next=/fitness" className="mt-3 inline-block rounded-xl bg-[#7c3aed] px-5 py-2.5 font-bold text-white">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const challenge = status?.challenge;
  const today = status?.today;
  const progressCurrent = challenge ? (challenge.goalType === 'minutes' ? today?.minutes ?? 0 : today?.steps ?? 0) : 0;
  const progressPct = challenge && challenge.goalTarget > 0 ? Math.min(100, Math.round((progressCurrent / challenge.goalTarget) * 100)) : 0;
  const distanceKm = ((today?.distanceM ?? 0) / 1000).toFixed(2);

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#16a34a] to-[#15803d] text-3xl text-white shadow-lg">🏃</div>
          <h1 className="mt-2 text-4xl font-black text-[#1e1b4b] md:text-5xl">Kids Fitness Challenge</h1>
          <p className="text-lg text-[#475569]">Walk every day, earn points, and climb the leaderboard!</p>
        </div>

        {status?.tableMissing ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-800">
            The Fitness Challenge isn&apos;t set up yet. Please check back soon!
          </div>
        ) : (
          <>
            {/* Today's challenge + progress */}
            <div className="overflow-hidden rounded-3xl border border-[#c4b5fd]/40 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] p-6 text-white shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">Today&apos;s challenge</p>
              <p className="mt-1 text-2xl font-black">{challenge ? challenge.name : 'No active challenge'}</p>
              {challenge ? (
                <>
                  <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-violet-100">
                    {progressCurrent.toLocaleString()} / {challenge.goalTarget.toLocaleString()} {challenge.goalType} · worth {challenge.points} points
                  </p>
                  {today?.goalMet ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 px-3 py-1 text-sm font-bold text-white">
                      <CheckCircle2 size={15} /> Completed today {today.pointsAwarded > 0 ? `(+${today.pointsAwarded} pts)` : ''}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            {justCompleted && today?.goalMet ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
                <PartyPopper className="mx-auto text-emerald-500" size={28} />
                <p className="mt-1 font-black text-emerald-800">Challenge complete — great walking! 🎉</p>
              </div>
            ) : null}

            {message ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm font-semibold text-emerald-700">{message}</p> : null}
            {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-center text-sm font-semibold text-rose-700">{error}</p> : null}

            {/* Sync / in-app counter / connect */}
            <div className="rounded-2xl border border-[#c4b5fd]/40 bg-white p-4 text-center shadow">
              {nativeSupported ? (
                <button
                  type="button"
                  onClick={sync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {syncing ? 'Syncing steps…' : 'Sync my steps'}
                </button>
              ) : pedometer.supported ? (
                <div>
                  <p className="font-bold text-[#1e1b4b]">🚶 Live step counter</p>
                  {pedometer.running ? (
                    <>
                      <p className="mt-2 text-4xl font-black text-[#16a34a] tabular-nums">
                        {(baseStepsRef.current + pedometer.steps).toLocaleString()}
                      </p>
                      <p className="text-xs text-[#64748b]">counting while this page is open…</p>
                      <button
                        type="button"
                        onClick={stopCounter}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-rose-700"
                      >
                        <Square size={18} className="fill-white" /> Stop &amp; save
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-[#475569]">
                        Put your phone in your pocket and start walking — the app counts your steps using the motion sensor.
                      </p>
                      <button
                        type="button"
                        onClick={startCounter}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                      >
                        <Play size={18} /> Start step counter
                      </button>
                    </>
                  )}
                  {pedometer.error ? <p className="mt-2 text-sm font-semibold text-rose-600">{pedometer.error}</p> : null}
                  <p className="mt-3 text-[11px] text-[#94a3b8]">
                    Tip: for automatic all-day counting (even when the app is closed), open Kids Zone in the mobile app and
                    allow Apple Health / Google Health Connect access.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-[#475569]">
                  <p className="font-bold text-[#1e1b4b]">📱 Connect your phone&apos;s health app</p>
                  <p className="mt-1">
                    Steps are counted automatically from Apple Health (iPhone) or Google Health Connect (Android) inside
                    the Kids Zone app. Open this in the app and allow health access — no typing needed.
                  </p>
                </div>
              )}
            </div>

            {/* Today's stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Footprints size={15} />} label="Steps today" value={(today?.steps ?? 0).toLocaleString()} tint="border-emerald-200 bg-emerald-50" />
              <StatCard icon={<Clock size={15} />} label="Minutes" value={String(today?.minutes ?? 0)} tint="border-sky-200 bg-sky-50" />
              <StatCard icon={<Flame size={15} />} label="Calories" value={String(today?.calories ?? 0)} tint="border-orange-200 bg-orange-50" />
              <StatCard icon={<MapPin size={15} />} label="Distance" value={`${distanceKm} km`} tint="border-violet-200 bg-violet-50" />
            </div>

            {/* Streaks & totals */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Flame size={15} />} label="Day streak" value={`${status?.currentStreak ?? 0} 🔥`} tint="border-rose-200 bg-rose-50" />
              <StatCard icon={<Footprints size={15} />} label="This week" value={(status?.weekSteps ?? 0).toLocaleString()} tint="border-teal-200 bg-teal-50" />
              <StatCard icon={<Star size={15} />} label="Lifetime steps" value={(status?.lifetimeSteps ?? 0).toLocaleString()} tint="border-indigo-200 bg-indigo-50" />
              <StatCard icon={<Trophy size={15} />} label="Fitness points" value={(status?.totalPoints ?? 0).toLocaleString()} tint="border-amber-200 bg-amber-50" />
            </div>

            {/* Achievements */}
            <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-6 shadow">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-[#1e1b4b]">
                <Award size={20} className="text-amber-500" /> Achievements
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(status?.achievements || []).map((a) => (
                  <div
                    key={a.key}
                    className={`rounded-2xl border p-3 text-center ${a.earned ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                  >
                    <div className="text-3xl">{a.earned ? a.emoji : '🔒'}</div>
                    <p className="mt-1 text-xs font-bold text-[#1e1b4b]">{a.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link href="/fitness/leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-[#7c3aed]/30 bg-white px-5 py-3 font-bold text-[#6d28d9] shadow-sm transition hover:bg-[#f5f3ff]">
                <Trophy size={18} /> Fitness Leaderboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
