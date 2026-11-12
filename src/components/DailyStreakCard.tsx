'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Flame, PartyPopper, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { usePointsProgress } from '@/lib/points-progress-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type StreakPreview = {
  available: boolean;
  reason?: 'already_claimed' | 'no_broken_streak' | 'repair_cooldown';
  nextStreak: number;
  dayIndex: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  isComeback: boolean;
};

type StreakSnapshot = {
  claimedToday: boolean;
  canClaim: boolean;
  canRepair: boolean;
  daysSinceClaim: number | null;
  claim: StreakPreview;
  repair: StreakPreview;
  ladder: { dayIndex: number; points: number; claimed: boolean }[];
  state: {
    currentStreak: number;
    longestStreak: number;
    totalClaims: number;
    lastClaimDate: string | null;
    lastRepairDate: string | null;
  };
};

type ClaimResponse = {
  ok?: boolean;
  message?: string;
  pointsAwarded?: number;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
  snapshot?: StreakSnapshot;
};

export function DailyStreakCard() {
  const { user, updateLocalProfile, refreshProfile } = useAuth();
  const { isYounger } = useAgeMode();
  const { showPointsProgress } = usePointsProgress();

  const [snapshot, setSnapshot] = useState<StreakSnapshot | null>(null);
  const [busy, setBusy] = useState<'claim' | 'repair' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch('/api/rewards/daily-streak', { cache: 'no-store', headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSnapshot(data as StreakSnapshot);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSnapshot(null);
      return;
    }
    void load();
  }, [user?.id, load]);

  if (!user || !snapshot) return null;

  const streak = snapshot.state.currentStreak;
  const takeAction = async (action: 'claim' | 'repair') => {
    if (busy) return;
    setBusy(action);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/rewards/daily-streak', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data: ClaimResponse = await res.json().catch(() => ({}));
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage(data.message || (res.ok ? 'Done!' : 'Could not update your streak.'));

      if (data.profile) {
        updateLocalProfile({
          points: data.profile.points,
          weeklyPoints: data.profile.weeklyPoints,
          monthlyPoints: data.profile.monthlyPoints,
          todayPoints: data.profile.todayPoints,
        });
      }

      const awarded = Number(data.pointsAwarded ?? 0);
      if (awarded > 0) {
        showPointsProgress({
          activity: 'mission',
          activityLabel: action === 'repair' ? 'Streak Repair' : 'Daily Streak',
          pointsEarned: awarded,
          message: data.snapshot?.claimedToday
            ? `Day ${data.snapshot.claim.dayIndex} — ${data.snapshot.state.currentStreak} day streak!`
            : undefined,
        });
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 2500);
        await refreshProfile();
      }
    } catch {
      setMessage('Could not update your streak right now.');
    } finally {
      setBusy(null);
    }
  };

  const claimLabel = busy === 'claim'
    ? 'Claiming…'
    : snapshot.claimedToday
      ? 'Claimed today'
      : `Claim +${snapshot.claim.totalPoints}`;

  return (
    <section className="rounded-3xl border border-orange-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-white/80 px-3 py-1 text-xs font-bold text-orange-700">
            <Flame size={14} />
            Daily Streak
          </div>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {streak > 0 ? (
              <>
                {streak} day{streak === 1 ? '' : 's'} in a row {celebrating ? '🎉' : '🔥'}
              </>
            ) : isYounger ? (
              'Start your streak today!'
            ) : (
              'Claim today to start your streak'
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isYounger
              ? 'Come back every day and your reward gets bigger!'
              : `Longest streak: ${snapshot.state.longestStreak} day${snapshot.state.longestStreak === 1 ? '' : 's'}. Bigger rewards on later days.`}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void takeAction('claim')}
            disabled={!snapshot.canClaim || busy !== null}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition-all ${
              snapshot.canClaim && !busy
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:-translate-y-0.5 hover:shadow-lg'
                : 'cursor-not-allowed border border-orange-200 bg-white text-slate-500'
            }`}
          >
            {claimLabel}
          </button>

          {snapshot.canRepair && (
            <button
              type="button"
              onClick={() => void takeAction('repair')}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={busy === 'repair' ? 'animate-spin' : ''} />
              {busy === 'repair' ? 'Repairing…' : `Repair streak (+${snapshot.repair.totalPoints})`}
            </button>
          )}
        </div>
      </div>

      {snapshot.claim.isComeback && !snapshot.claimedToday && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-white/80 px-4 py-3 text-sm text-amber-900">
          <PartyPopper size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            Welcome back! Claim today for a <strong>{snapshot.claim.bonusPoints}-point</strong> comeback gift on top
            of your day&nbsp;{snapshot.claim.dayIndex} reward.
          </span>
        </div>
      )}

      <ol className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {snapshot.ladder.map((step) => {
          const isNext = !snapshot.claimedToday && step.dayIndex === snapshot.claim.dayIndex;
          return (
            <li
              key={step.dayIndex}
              className={`rounded-2xl border px-2 py-3 text-center transition ${
                step.claimed
                  ? 'border-orange-400/60 bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-sm'
                  : isNext
                    ? 'border-orange-300 bg-white ring-2 ring-orange-300/60'
                    : 'border-orange-200 bg-white/70'
              }`}
            >
              <div className="flex justify-center">
                {step.claimed ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <Sparkles size={16} className={isNext ? 'text-orange-500' : 'text-orange-300'} />
                )}
              </div>
              <p className={`mt-1 text-[11px] font-bold uppercase tracking-wide ${step.claimed ? 'text-white/90' : 'text-slate-500'}`}>
                Day {step.dayIndex}
              </p>
              <p className={`text-sm font-black ${step.claimed ? 'text-white' : 'text-slate-800'}`}>+{step.points}</p>
            </li>
          );
        })}
      </ol>

      {message && <p className="mt-3 text-sm font-semibold text-orange-900">{message}</p>}
    </section>
  );
}
