'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Award, CalendarDays, CheckCircle2, Sparkles, Star, Trophy } from 'lucide-react';

type WeeklyStarsResponse = {
  week: {
    weekStartDate: string;
    weekEndDate: string;
    weekStartIso: string;
    weekEndIso: string;
  };
  activeDays: number;
  weeklyStars: number;
  maxWeeklyStars: number;
  thresholds: number[];
  nextTarget: number | null;
  daysToNextStar: number;
  monthlyPoints: number;
  totalPoints: number;
};

type MonthlyStarMonth = {
  key: string;
  monthStart: string;
  isCurrent: boolean;
  points: number;
  starEarned: boolean;
  pointsToStar: number;
};

type StarsResponse = {
  quarterKey: string;
  monthlyStarMinPoints: number;
  quarterlyDrawMinStars: number;
  starsThisQuarter: number;
  eligibleForQuarterlyDraw: boolean;
  months: MonthlyStarMonth[];
  currentMonthlyPoints: number;
  totalPoints: number;
};

const RULES = [
  { days: 2, stars: 1 },
  { days: 4, stars: 2 },
  { days: 6, stars: 3 },
];

function starRow(stars: number, maxStars: number): string {
  return Array.from({ length: maxStars }, (_, idx) => (idx < stars ? '⭐' : '☆')).join(' ');
}

function formatMonthLabel(monthStart: string): string {
  const date = new Date(`${monthStart}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return monthStart.slice(0, 7);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function StarsClient() {
  const { user, loading } = useAuth() as any;
  const [weekly, setWeekly] = React.useState<WeeklyStarsResponse | null>(null);
  const [quarterly, setQuarterly] = React.useState<StarsResponse | null>(null);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setWeekly(null);
        setQuarterly(null);
        setPageLoading(false);
        return;
      }

      setError(null);
      setPageLoading(true);
      try {
        const [weeklyRes, starsRes] = await Promise.all([
          fetch(`/api/rewards/weekly-stars?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' }),
          fetch(`/api/rewards/stars?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' }),
        ]);
        const weeklyJson = await weeklyRes.json();
        const starsJson = await starsRes.json();
        if (!weeklyRes.ok) throw new Error(weeklyJson?.error || 'Failed to load weekly stars');
        if (!starsRes.ok) throw new Error(starsJson?.error || 'Failed to load monthly stars');
        setWeekly(weeklyJson);
        setQuarterly(starsJson);
      } catch (e: any) {
        setError(e?.message || 'Failed to load stars');
      } finally {
        setPageLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading || pageLoading) {
    return (
      <div className="page-inner">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-700">Loading stars…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Star system</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Collect stars every week</h1>
              <p className="mt-2 text-sm text-slate-700">
                2 active days = 1 star, 4 active days = 2 stars, 6 active days = 3 stars. Monthly points keep adding and quarterly star totals unlock prizes.
              </p>
            </div>
            <Link
              href="/rewards"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
            >
              Back to Rewards <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        ) : null}

        {weekly && quarterly ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-violet-700">Weekly stars</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{weekly.weeklyStars}/{weekly.maxWeeklyStars}</p>
                <p className="mt-1 text-sm text-slate-600">{starRow(weekly.weeklyStars, weekly.maxWeeklyStars)}</p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-sky-700">This week</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{weekly.activeDays} days</p>
                <p className="mt-1 text-sm text-slate-600">
                  {weekly.daysToNextStar > 0
                    ? `${weekly.daysToNextStar} more day${weekly.daysToNextStar === 1 ? '' : 's'} to the next star`
                    : 'All weekly stars unlocked'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">This month</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{quarterly.currentMonthlyPoints}</p>
                <p className="mt-1 text-sm text-slate-600">Points earned this month</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-amber-700">Quarterly prize</p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {quarterly.starsThisQuarter}/{quarterly.quarterlyDrawMinStars}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {quarterly.eligibleForQuarterlyDraw
                    ? 'You qualify for the three-month prize draw'
                    : `${Math.max(0, quarterly.quarterlyDrawMinStars - quarterly.starsThisQuarter)} more star${quarterly.quarterlyDrawMinStars - quarterly.starsThisQuarter === 1 ? '' : 's'} needed`}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-violet-600" />
                <h2 className="text-lg font-black text-slate-900">Weekly rule ladder</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {RULES.map((rule) => (
                  <div key={rule.days} className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
                    <p className="text-xs font-bold uppercase text-violet-700">{rule.days} active days</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {rule.stars} star{rule.stars === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Weekly stars reward consistency. Keep showing up across the quarter to grow your star total and unlock prizes.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-600" />
                <h2 className="text-lg font-black text-slate-900">Monthly points and star progress</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quarterly.months.map((month) => (
                  <div
                    key={month.key}
                    className={`rounded-2xl border p-4 ${month.isCurrent ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatMonthLabel(month.monthStart)}</p>
                        <p className="text-xs text-slate-600">{month.isCurrent ? 'Current month' : 'Past month'}</p>
                      </div>
                      <p className="text-2xl font-black text-violet-700">{month.points}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
                      <span>{month.starEarned ? 'Star earned' : `${month.pointsToStar} to next star`}</span>
                      <span className="font-bold">{month.starEarned ? '⭐' : '☆'}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-500"
                        style={{ width: `${Math.min(100, (month.points / quarterly.monthlyStarMinPoints) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-emerald-700" />
                <h2 className="text-lg font-black text-emerald-950">Certificates and prize cycle</h2>
              </div>
              <p className="mt-3 text-sm text-emerald-900">
                Weekly stars reward consistent activity. Monthly points keep building every month, and quarterly star totals decide who is ready for the three-month prize and certificate cycle.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/leaderboard" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500">
                  View leaderboard <Trophy size={16} />
                </Link>
                <Link href="/rewards" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
                  Back to rewards
                </Link>
              </div>
            </section>
          </>
        ) : null}

        {!weekly && !quarterly && !error ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-slate-400" size={24} />
            <p className="mt-2 font-semibold text-slate-700">Sign in to see your stars and points.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
