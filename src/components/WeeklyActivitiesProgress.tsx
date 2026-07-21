'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BookOpen, Gamepad2, Mic, Sparkles, Star } from 'lucide-react';
import { WeeklyActivityPopup } from './WeeklyActivityPopup';

type WeeklyActivities = {
  quiz: number;
  game: number;
  pledge: number;
  recording: number;
};

type WeeklyChallengeResponse = {
  completed: number;
  total: number;
  remaining: number;
  qualifiedForDraw: boolean;
  activities: WeeklyActivities;
};

export function WeeklyActivitiesProgress() {
  const { user, profile } = useAuth() as any;
  const userId = (user?.id || profile?.uid || '').trim();
  const [data, setData] = useState<WeeklyChallengeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rewards/weekly-activities?userId=${userId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when user returns to this tab/page (handles browser back button & tab switching)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchData]);

  const items = useMemo(() => {
    const activities = data?.activities;
    return [
      { key: 'quiz', label: 'Quiz', href: '/quiz', count: activities?.quiz ?? 0, icon: BookOpen },
      { key: 'game', label: 'Games', href: '/games', count: activities?.game ?? 0, icon: Gamepad2 },
      { key: 'pledge', label: 'Durood & Zikr', href: '/pledge', count: activities?.pledge ?? 0, icon: Sparkles },
      { key: 'recording', label: 'Stories / Recording', href: 'https://create-me-a-audio.vercel.app/kids-record', count: activities?.recording ?? 0, icon: Mic },
      { key: 'total', label: 'Total toward 5', href: '/leaderboard', count: data?.completed ?? 0, icon: Star },
    ];
  }, [data]);

  const progressPercent = data ? Math.min(100, Math.round((data.completed / data.total) * 100)) : 0;
  const completedCount = Number(data?.completed ?? 0);
  const totalCount = Number(data?.total ?? 5);
  const remainingCount = Math.max(0, Number(data?.remaining ?? Math.max(0, totalCount - completedCount)));

  if (!userId) return null;

  return (
    <>
      <WeeklyActivityPopup userId={userId} />
      <section className="mb-8 rounded-3xl border border-[#7c3aed]/25 bg-gradient-to-br from-[#ecfdf5] via-white to-[#f5f3ff] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-[#ccfbf1] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5b21b6]">
              Weekly 5 Activities Challenge
            </div>
            <h2 className="mt-3 text-2xl font-bold text-[#4c1d95]">Finish any 5 activities this week</h2>
            <p className="mt-2 text-sm text-[#5b21b6] md:text-base">
              {loading
                ? 'Checking your weekly challenge progress...'
                : data?.qualifiedForDraw
                ? 'Amazing! You completed all 5 activities this week.'
                : `You have ${data?.remaining ?? 5} activit${(data?.remaining ?? 5) === 1 ? 'y' : 'ies'} left to complete your weekly challenge.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-[#7c3aed] px-3 py-3 text-sm font-bold text-[#7c3aed] transition hover:bg-[#ecfdf5] disabled:opacity-50"
              title="Refresh progress"
            >
              {loading ? '...' : '↻'}
            </button>
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-xl bg-[#7c3aed] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6d28d9]"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#99f6e4] bg-white p-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Completed This Week</p>
              <p className="mt-1 text-3xl font-black text-emerald-800">{loading ? '...' : completedCount}</p>
              <p className="text-xs font-semibold text-emerald-700">Target: {totalCount} activities</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Activities Left</p>
              <p className="mt-1 text-3xl font-black text-amber-800">{loading ? '...' : remainingCount}</p>
              <p className="text-xs font-semibold text-amber-700">Complete any activities to reach your weekly 5</p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#5b21b6]">
            <span>{loading ? 'Loading progress...' : `${data?.completed ?? 0}/${data?.total ?? 5} activities done`}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[#ccfbf1]">
            <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-3 text-xs font-semibold text-[#5b21b6]">
            Any activities completed during the week count. You can use any mix (for example 5 quizzes, or 3 games + 2 quizzes).
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            const count = Number(item.count || 0);
            const isTotalCard = item.key === 'total';
            const reachedTarget = Boolean(data?.qualifiedForDraw);
            const inner = (
              <div className={`rounded-2xl border px-4 py-4 transition ${isTotalCard ? (reachedTarget ? 'border-emerald-200 bg-emerald-50' : 'border-[#7c3aed]/30 bg-[#ecfdf5]') : 'border-[#c4b5fd]/30 bg-white hover:border-[#7c3aed]/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isTotalCard ? (reachedTarget ? 'bg-emerald-600 text-white' : 'bg-[#7c3aed] text-white') : 'bg-[#ede9fe] text-[#1e1b4b]'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1e1b4b]">{item.label}</p>
                    <p className={`text-xs font-semibold ${isTotalCard ? (reachedTarget ? 'text-emerald-700' : 'text-[#5b21b6]') : 'text-[#475569]'}`}>
                      {item.key === 'total' ? `${Math.min(5, count)}/5 counted this week` : `${count} completed this week`}
                    </p>
                  </div>
                </div>
              </div>
            );

            return item.href.startsWith('http') ? (
              <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer">
                {inner}
              </a>
            ) : (
              <Link key={item.key} href={item.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}