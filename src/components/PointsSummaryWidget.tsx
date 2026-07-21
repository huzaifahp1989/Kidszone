'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Trophy, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';
import { getKidLevelTitle, parseLevelNumber } from '@/lib/level-names';

type PointsSummaryWidgetProps = {
  compact?: boolean;
  className?: string;
};

/** Shared Today / This week / All-time points display for kids. */
export function PointsSummaryWidget({ compact = false, className = '' }: PointsSummaryWidgetProps) {
  const { user, profile } = useAuth();

  if (!user || !profile) return null;

  const todayPoints = Number(profile.todayPoints ?? 0);
  const weeklyPoints = Number(profile.weeklyPoints ?? 0);
  const totalPoints = Number(profile.points ?? 0);
  const levelTitle = getKidLevelTitle(profile.level);
  const levelNum = parseLevelNumber(profile.level);
  const progressInLevel = totalPoints % 100;
  const levelProgressPct = Math.min(100, Math.max(2, progressInLevel));
  const todayRemaining = Math.max(0, POINTS_DAILY_CAP - todayPoints);

  if (compact) {
    return (
      <div className={`grid grid-cols-3 gap-2 text-center ${className}`}>
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-2 py-2">
          <p className="text-[10px] font-bold uppercase text-violet-700">Today</p>
          <p className="text-lg font-black text-slate-900">{todayPoints}<span className="text-xs font-bold text-slate-500">/{POINTS_DAILY_CAP}</span></p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-2 py-2">
          <p className="text-[10px] font-bold uppercase text-amber-800">This week</p>
          <p className="text-lg font-black text-slate-900">{weeklyPoints}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-2 py-2">
          <p className="text-[10px] font-bold uppercase text-emerald-800">All time</p>
          <p className="text-lg font-black text-slate-900">{totalPoints}</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`surface-card p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-violet-900">
            <Sparkles size={16} className="text-violet-600" />
            Your points
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Level {levelNum}: <span className="font-bold text-slate-900">{levelTitle}</span>
          </p>
        </div>
        <Link href="/guide" className="text-xs font-bold text-violet-700 hover:underline">
          How to earn →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">
            <Star size={14} /> Today
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {todayPoints}
            <span className="text-base font-bold text-slate-500"> / {POINTS_DAILY_CAP}</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {todayRemaining > 0 ? `${todayRemaining} left today` : 'Daily max reached!'}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
            <Trophy size={14} /> This week
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{weeklyPoints}</p>
          <p className="mt-1 text-xs text-slate-600">Counts toward the leaderboard</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
            <Sparkles size={14} /> All time
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totalPoints}</p>
          <p className="mt-1 text-xs text-slate-600">{profile.badges ?? 0} badges earned</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Progress to next badge</span>
          <span>{progressInLevel} / 100 ⭐</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-all duration-500"
            style={{ width: `${levelProgressPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
