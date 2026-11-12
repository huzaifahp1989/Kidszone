'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Crown, Lock, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { usePointsProgress } from '@/lib/points-progress-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type QuestStatus = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  points: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
};

type Board = {
  weekStartDate: string;
  weekEndDate: string;
  daysRemaining: number;
  quests: QuestStatus[];
  summary: {
    completedCount: number;
    claimedCount: number;
    totalCount: number;
    totalPointsAvailable: number;
    allCompleted: boolean;
    allClaimed: boolean;
  };
  chest: {
    points: number;
    badgeName: string;
    unlocked: boolean;
    claimed: boolean;
    claimedAt: string | null;
  };
};

type ClaimResponse = {
  ok?: boolean;
  message?: string;
  pointsAwarded?: number;
  board?: Board;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
};

function percent(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

export function WeeklyQuestBoard() {
  const { user, updateLocalProfile, refreshProfile } = useAuth();
  const { isYounger } = useAgeMode();
  const { showPointsProgress } = usePointsProgress();

  const [board, setBoard] = useState<Board | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch('/api/quests/weekly', { cache: 'no-store', headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.board) setBoard(data.board as Board);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setBoard(null);
      return;
    }
    void load();
  }, [user?.id, load]);

  if (!user || !board) return null;

  const claim = async (payload: { questKey?: string; chest?: boolean }, key: string) => {
    if (busyKey) return;
    setBusyKey(key);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/quests/weekly', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data: ClaimResponse = await res.json().catch(() => ({}));
      if (data.board) setBoard(data.board);
      setMessage(data.message || (res.ok ? 'Nice work!' : 'Could not bank that right now.'));

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
          activityLabel: payload.chest ? 'Weekly Chest' : 'Weekly Quest',
          pointsEarned: awarded,
          message: payload.chest ? `${board.chest.badgeName} badge unlocked` : undefined,
        });
        await refreshProfile();
      }
    } catch {
      setMessage('Could not bank that right now.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-white/80 px-3 py-1 text-xs font-bold text-teal-700">
            <Trophy size={14} />
            Weekly Quests
          </div>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {isYounger ? 'Your quest board' : 'Complete quests, collect big rewards'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {board.summary.claimedCount}/{board.summary.totalCount} banked · up to{' '}
            <strong>+{board.summary.totalPointsAvailable}</strong> points this week
          </p>
        </div>
        <div className="rounded-2xl border border-teal-300/40 bg-white/80 px-4 py-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Resets in</p>
          <p className="text-2xl font-black text-teal-900">
            {board.daysRemaining} <span className="text-sm font-bold">day{board.daysRemaining === 1 ? '' : 's'}</span>
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {board.quests.map((quest) => {
          const pct = percent(quest.progress, quest.target);
          return (
            <li
              key={quest.key}
              className={`rounded-2xl border px-4 py-3 transition ${
                quest.claimed
                  ? 'border-teal-300 bg-teal-50/70'
                  : quest.claimable
                    ? 'border-amber-300 bg-white shadow-sm ring-1 ring-amber-200'
                    : 'border-teal-200/70 bg-white/70'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  {quest.icon}
                </span>
                <div className="min-w-[9rem] flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{quest.title}</h3>
                    <span className="rounded-full bg-teal-600/10 px-2 py-0.5 text-[11px] font-bold text-teal-700">
                      +{quest.points} pts
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{quest.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {quest.claimed ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-teal-700">
                      <Check size={16} strokeWidth={3} />
                      Banked
                    </span>
                  ) : quest.claimable ? (
                    <button
                      type="button"
                      onClick={() => void claim({ questKey: quest.key }, quest.key)}
                      disabled={busyKey !== null}
                      className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
                    >
                      {busyKey === quest.key ? 'Banking…' : `Claim +${quest.points}`}
                    </button>
                  ) : (
                    <Link
                      href={quest.href}
                      className="inline-flex items-center gap-1 rounded-xl border border-teal-300 bg-white px-3 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
                    >
                      Go <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-teal-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-600">
                  {Math.min(quest.progress, quest.target)}/{quest.target} {quest.unit}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4 ${
          board.chest.claimed
            ? 'border-emerald-300 bg-emerald-50'
            : board.chest.unlocked
              ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
            {board.chest.claimed ? <Crown size={22} className="text-amber-500" /> : board.chest.unlocked ? '🎁' : <Lock size={20} className="text-slate-400" />}
          </span>
          <div>
            <h3 className="font-bold text-slate-900">Weekly Chest</h3>
            <p className="text-sm text-slate-600">
              {board.chest.claimed
                ? `Opened — “${board.chest.badgeName}”.`
                : board.chest.unlocked
                  ? `All quests done! Open it for +${board.chest.points} and the “${board.chest.badgeName}” badge.`
                  : `Finish all ${board.summary.totalCount} quests to unlock +${board.chest.points} and a badge.`}
            </p>
          </div>
        </div>

        {board.chest.claimed ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Check size={16} strokeWidth={3} />
            Claimed
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void claim({ chest: true }, 'chest')}
            disabled={!board.chest.unlocked || busyKey !== null}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition ${
              board.chest.unlocked && !busyKey
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:-translate-y-0.5 hover:shadow-lg'
                : 'cursor-not-allowed border border-slate-200 bg-white text-slate-400'
            }`}
          >
            {busyKey === 'chest' ? 'Opening…' : `Open chest +${board.chest.points}`}
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-sm font-semibold text-teal-900">{message}</p>}
    </section>
  );
}
