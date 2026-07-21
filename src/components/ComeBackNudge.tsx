'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Sparkles, Target, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { usePointsProgress } from '@/lib/points-progress-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import {
  getWeeklyDrawPointsRemaining,
  WEEKLY_DRAW_MIN_POINTS,
} from '@/lib/leaderboard-rules';

type MissionSummary = {
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
};

type FamilyStreak = {
  streak: number;
  creditedToday: boolean;
} | null;

type MysterySnapshot = {
  activeDays: number;
  requiredDays: number;
  unlocked: boolean;
  claimed: boolean;
  claim?: { pointsAwarded: number; badgeName: string } | null;
};

export function ComeBackNudge() {
  const { user, profile, refreshProfile, updateLocalProfile } = useAuth();
  const { isYounger } = useAgeMode();
  const { showPointsProgress } = usePointsProgress();

  const [missions, setMissions] = useState<MissionSummary | null>(null);
  const [missionRewardPts, setMissionRewardPts] = useState(10);
  const [familyStreak, setFamilyStreak] = useState<FamilyStreak>(null);
  const [mystery, setMystery] = useState<MysterySnapshot | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    (async () => {
      try {
        const headers = await getAuthFetchHeaders();
        const [missionsRes, mysteryRes] = await Promise.all([
          fetch(`/api/kids-zone/daily-missions?userId=${encodeURIComponent(user.id)}`, {
            cache: 'no-store',
            headers,
          }),
          fetch('/api/mystery-box', { cache: 'no-store', headers }),
        ]);

        const missionsData = await missionsRes.json().catch(() => ({}));
        const mysteryData = await mysteryRes.json().catch(() => ({}));

        if (!active) return;

        if (missionsRes.ok) {
          setMissions(missionsData.summary || null);
          setMissionRewardPts(Number(missionsData?.reward?.points ?? 10));
          setFamilyStreak(missionsData.familyStreak || null);
        }
        if (mysteryRes.ok) {
          setMystery({
            activeDays: Number(mysteryData.activeDays ?? 0),
            requiredDays: Number(mysteryData.requiredDays ?? 7),
            unlocked: Boolean(mysteryData.unlocked),
            claimed: Boolean(mysteryData.claimed),
            claim: mysteryData.claim || null,
          });
        }
      } catch {
        /* non-blocking */
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id, profile?.todayPoints, profile?.weeklyPoints]);

  if (!user) return null;

  const weeklyPoints = Number(profile?.weeklyPoints ?? 0);
  const drawRemaining = getWeeklyDrawPointsRemaining(weeklyPoints);
  const inDraw = drawRemaining === 0;
  const missionsLeft = missions
    ? Math.max(0, missions.totalCount - missions.completedCount)
    : null;

  const claimBox = async () => {
    if (claiming) return;
    setClaiming(true);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/mystery-box', { method: 'POST', body: '{}' });
      const data = await res.json().catch(() => ({}));
      setMessage(data?.message || (res.ok ? 'Opened!' : 'Could not open box.'));
      if (data?.snapshot) {
        setMystery({
          activeDays: Number(data.snapshot.activeDays ?? 0),
          requiredDays: Number(data.snapshot.requiredDays ?? 7),
          unlocked: Boolean(data.snapshot.unlocked),
          claimed: Boolean(data.snapshot.claimed),
          claim: data.snapshot.claim || null,
        });
      }
      if (data?.profile) {
        updateLocalProfile({
          points: data.profile.points,
          weeklyPoints: data.profile.weeklyPoints,
          monthlyPoints: data.profile.monthlyPoints,
          todayPoints: data.profile.todayPoints,
        });
      }
      if (Number(data?.pointsAwarded ?? 0) > 0) {
        showPointsProgress({
          activity: 'other',
          activityLabel: 'Mystery Box',
          pointsEarned: Number(data.pointsAwarded),
          message: data.badgeName ? `Badge: ${data.badgeName}` : undefined,
        });
        await refreshProfile();
      }
    } catch {
      setMessage('Could not open the mystery box.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <section className="space-y-4 stagger-in">
      <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-5 sm:p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-violet-700">
          <Sparkles size={14} />
          {isYounger ? 'Come back tomorrow!' : 'Keep your streak going'}
        </div>
        <h2 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">
          {isYounger ? 'Almost there!' : 'Near-miss goals'}
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
            <Target className="mt-0.5 shrink-0 text-amber-600" size={18} />
            <span>
              {inDraw ? (
                isYounger ? (
                  <>You are in the weekly prize draw — keep playing!</>
                ) : (
                  <>
                    You are eligible for the weekly draw (above {WEEKLY_DRAW_MIN_POINTS} weekly points).
                  </>
                )
              ) : isYounger ? (
                <>
                  Only <strong>{drawRemaining}</strong> more points to enter the weekly prize draw!
                </>
              ) : (
                <>
                  <strong>{drawRemaining}</strong> points left to enter the weekly draw (need above{' '}
                  {WEEKLY_DRAW_MIN_POINTS}).
                </>
              )}{' '}
              <Link href="/quiz" className="font-bold text-violet-700 hover:underline">
                Earn more →
              </Link>
            </span>
          </li>

          {missionsLeft != null && missionsLeft > 0 && (
            <li className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
              <Gift className="mt-0.5 shrink-0 text-rose-500" size={18} />
              <span>
                {isYounger ? (
                  <>
                    Finish {missionsLeft === 1 ? '1 more mission' : `${missionsLeft} more missions`} for +
                    {missionRewardPts} bonus!
                  </>
                ) : (
                  <>
                    Finish {missionsLeft} more daily mission{missionsLeft === 1 ? '' : 's'} to unlock +
                    {missionRewardPts} bonus points.
                  </>
                )}{' '}
                <Link href="#daily-missions" className="font-bold text-violet-700 hover:underline">
                  Missions ↓
                </Link>
              </span>
            </li>
          )}

          {familyStreak && (
            <li className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
              <Users className="mt-0.5 shrink-0 text-teal-600" size={18} />
              <span>
                {familyStreak.creditedToday
                  ? isYounger
                    ? `Family streak: ${familyStreak.streak} days — great job today!`
                    : `Family streak is alive today (${familyStreak.streak} days).`
                  : isYounger
                    ? `Keep the family streak going — finish missions today!`
                    : `Keep the family streak alive today (current: ${familyStreak.streak} days).`}
              </span>
            </li>
          )}
        </ul>
      </div>

      {mystery && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">7-day mystery box</p>
              <h3 className="mt-1 font-heading text-lg font-bold text-slate-900">
                {isYounger ? 'Surprise box' : 'Weekly mystery reward'}
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {mystery.claimed && mystery.claim
                  ? `Opened: “${mystery.claim.badgeName}” (+${mystery.claim.pointsAwarded})`
                  : isYounger
                    ? `Play on ${mystery.requiredDays} different days this week to open it!`
                    : `Be active on ${mystery.requiredDays} distinct days this score week for +15–30 pts + a badge.`}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                Active days: {mystery.activeDays} / {mystery.requiredDays}
              </p>
            </div>
            {!mystery.claimed && (
              <button
                type="button"
                disabled={!mystery.unlocked || claiming}
                onClick={() => void claimBox()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claiming ? 'Opening…' : mystery.unlocked ? 'Open box!' : 'Keep going'}
              </button>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
              style={{
                width: `${Math.min(100, Math.round((mystery.activeDays / mystery.requiredDays) * 100))}%`,
              }}
            />
          </div>
          {message && <p className="mt-3 text-sm font-semibold text-amber-900">{message}</p>}
        </div>
      )}
    </section>
  );
}
