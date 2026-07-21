'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ACTIVITY_BONUS_POINTS,
  DAILY_PLAN_TOTAL_POINTS,
  MAX_DAILY_GAME_COMPLETIONS,
  MAX_DAILY_QUIZ_ATTEMPTS,
  POINTS_DAILY_CAP,
  QUIZ_POINTS_PER_COMPLETION,
} from '@/lib/points-policy';

type DailyPointsBarProps = {
  quizAttemptsUsed?: number;
  compact?: boolean;
  className?: string;
};

export function DailyPointsBar({ quizAttemptsUsed, compact = false, className = '' }: DailyPointsBarProps) {
  const { user, profile } = useAuth();

  if (!user) return null;

  const todayPoints = Number(profile?.todayPoints ?? 0);
  const remaining = Math.max(0, POINTS_DAILY_CAP - todayPoints);
  const progressPct = Math.min(100, (todayPoints / POINTS_DAILY_CAP) * 100);
  const atDailyCap = remaining <= 0;
  const quizzesDone = typeof quizAttemptsUsed === 'number' && quizAttemptsUsed >= MAX_DAILY_QUIZ_ATTEMPTS;
  const showActivityHint = quizzesDone && !atDailyCap;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-2 text-sm ${className}`}
        aria-label={`${remaining} points left today out of ${POINTS_DAILY_CAP}`}
      >
        <Sparkles size={16} className="shrink-0 text-violet-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-violet-900">
            <span>Today: {todayPoints}/{POINTS_DAILY_CAP}</span>
            <span className={atDailyCap ? 'text-emerald-700' : 'text-violet-700'}>
              {atDailyCap ? 'Daily max reached!' : `${remaining} left`}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <Link
          href="/guide"
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100"
          title="How to earn points"
        >
          <HelpCircle size={12} />
          Guide
        </Link>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-violet-900">
            <Sparkles size={16} className="text-violet-600" />
            Daily points
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {todayPoints}
            <span className="text-lg font-bold text-slate-500"> / {POINTS_DAILY_CAP}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Points left today</p>
          <p className={`text-3xl font-black ${atDailyCap ? 'text-emerald-600' : 'text-violet-700'}`}>
            {atDailyCap ? '0' : remaining}
          </p>
        </div>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-600">
        Daily plan ({DAILY_PLAN_TOTAL_POINTS} pts): {MAX_DAILY_QUIZ_ATTEMPTS} quizzes × {QUIZ_POINTS_PER_COMPLETION} ·{' '}
        {MAX_DAILY_GAME_COMPLETIONS} games × {ACTIVITY_BONUS_POINTS} · Durood · Zikr · Hadith · Salah ·{' '}
        <Link href="/guide" className="font-bold text-violet-700 hover:underline">
          Full guide
        </Link>
      </p>

      {showActivityHint && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-bold">Both quizzes done — {remaining} points left today!</p>
          <p className="mt-1">Try games, Durood, Zikr, Hadith, or Salah — each earns +{ACTIVITY_BONUS_POINTS} points.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/games" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50">
              🎮 Games
            </Link>
            <Link href="/pledge" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50">
              📿 Pledge
            </Link>
            <Link href="/hadith" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50">
              📖 Hadith
            </Link>
            <Link href="/salah" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50">
              🕌 Salah
            </Link>
          </div>
        </div>
      )}

      {atDailyCap && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          MashaAllah! You reached today&apos;s {POINTS_DAILY_CAP}-point limit. Come back tomorrow for more.
        </p>
      )}
    </div>
  );
}
