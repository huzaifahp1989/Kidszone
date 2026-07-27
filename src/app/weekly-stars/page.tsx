'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type WeeklyStarsResponse = {
  week: {
    weekStartDate: string;
    weekEndDate: string;
  };
  activeDays: number;
  weeklyStars: number;
  maxWeeklyStars: number;
  thresholds: number[];
  nextTarget: number | null;
  daysToNextStar: number;
  monthlyPoints: number;
};

function visualStars(stars: number, maxStars: number) {
  return Array.from({ length: maxStars }, (_, idx) => (idx < stars ? '⭐' : '☆')).join(' ');
}

export default function WeeklyStarsPage() {
  const { user, loading } = useAuth() as any;
  const [data, setData] = useState<WeeklyStarsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setError(null);
      try {
        const res = await fetch(`/api/rewards/weekly-stars?userId=${user.id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load weekly stars');
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Failed to load weekly stars');
      }
    };
    load();
  }, [user?.id]);

  const ruleText = useMemo(() => {
    if (!data?.thresholds?.length) return '2 days = 1 star, 4 days = 2 stars, 6 days = 3 stars';
    return `${data.thresholds[0]} days = 1 star, ${data.thresholds[1]} days = 2 stars, ${data.thresholds[2]} days = 3 stars`;
  }, [data?.thresholds]);

  if (loading) {
    return (
      <div className="page-inner">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-700">Loading weekly stars…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <main className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Weekly stars</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Stay active, collect stars</h1>
              <p className="mt-2 text-sm text-slate-700">{ruleText}</p>
            </div>
            <Link
              href="/rewards"
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
            >
              Back to Rewards
            </Link>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        ) : null}

        {data ? (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-amber-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-amber-800">Active days</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{data.activeDays}</p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-violet-800">Weekly stars</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{data.weeklyStars}/{data.maxWeeklyStars}</p>
                  <p className="mt-1 text-lg">{visualStars(data.weeklyStars, data.maxWeeklyStars)}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-sky-800">Monthly points</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{data.monthlyPoints}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <CalendarDays size={18} /> This week
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Week range: <span className="font-semibold">{data.week.weekStartDate}</span> to <span className="font-semibold">{data.week.weekEndDate}</span>
              </p>
              {data.nextTarget == null ? (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  You reached all 3 weekly stars. Amazing work!
                </p>
              ) : (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {data.daysToNextStar} more active day{data.daysToNextStar === 1 ? '' : 's'} to reach {data.nextTarget} days and unlock your next star.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Star size={18} /> Star rules
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>2 active days in a week = 1 star</li>
                <li>4 active days in a week = 2 stars</li>
                <li>6 active days in a week = 3 stars</li>
                <li>Weekly stars are based on activity days, not on resetting total points.</li>
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
