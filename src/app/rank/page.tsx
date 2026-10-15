'use client';

import Link from 'next/link';
import { ArrowRight, Check, Medal, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DAILY_EARNING_PLAN, POINTS_DAILY_CAP } from '@/lib/points-policy';
import { getKidRank, KID_RANKS } from '@/lib/level-names';

export default function RankPage() {
  const { profile, loading } = useAuth();
  const points = profile?.points ?? 0;
  const rank = getKidRank(points);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-amber-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-xl sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">Your learning journey</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{rank.emoji} {rank.title}</h1>
              <p className="mt-3 max-w-xl text-teal-100">
                {loading ? 'Loading your points...' : profile ? `You have ${points.toLocaleString()} points. Keep learning and doing good deeds to rise through the ranks.` : 'Sign in to see your personal rank and points.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-200">Lifetime points</p>
              <p className="mt-1 text-3xl font-black text-amber-300">{points.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-sm font-bold">
              <span>{rank.title}</span>
              <span>{rank.nextMinimumPoints ? `${rank.pointsToNext} points to ${KID_RANKS[KID_RANKS.findIndex((item) => item.title === rank.title) + 1]?.title}` : 'Top rank reached'}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all" style={{ width: `${rank.progressPercent}%` }} />
            </div>
          </div>
        </header>

        {!profile && !loading && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-amber-900">
            <Link href="/signin" className="underline underline-offset-2">Sign in</Link> to track your personal rank.
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Medal className="text-teal-700" size={22} />
            <h2 className="text-2xl font-black text-slate-900">All ranks</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KID_RANKS.map((item) => {
              const reached = points >= item.minimumPoints;
              const current = item.title === rank.title;
              return (
                <div key={item.title} className={`rounded-2xl border p-4 transition ${current ? 'border-teal-400 bg-teal-50 shadow-md ring-2 ring-teal-200' : reached ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white/70'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl" aria-hidden>{item.emoji}</span>
                    {reached ? <Check size={18} className="text-emerald-600" aria-label="Rank reached" /> : <span className="text-xs font-bold text-slate-500">Locked</span>}
                  </div>
                  <h3 className="mt-3 font-black text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.minimumPoints.toLocaleString()} points</p>
                  {current && <p className="mt-2 text-xs font-black uppercase tracking-wider text-teal-700">Current rank</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Target className="text-amber-600" size={21} />
              <h2 className="text-xl font-black text-slate-900">How to gain more points</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Choose any mix of activities. You can earn up to {POINTS_DAILY_CAP} points each day.</p>
            <div className="mt-4 divide-y divide-slate-100">
              {DAILY_EARNING_PLAN.map((activity) => (
                <Link key={activity.activity} href={activity.href} className="flex items-center justify-between gap-3 py-3 transition hover:text-teal-700">
                  <span><span className="block font-bold text-slate-900">{activity.title}</span><span className="text-xs text-slate-500">{activity.limit} {activity.limit === 1 ? 'time' : 'times'} per day</span></span>
                  <span className="flex shrink-0 items-center gap-1 font-black text-amber-600">+{activity.pointsEach} <ArrowRight size={16} /></span>
                </Link>
              ))}
            </div>
            <Link href="/guide" className="mt-4 inline-flex items-center gap-2 font-black text-teal-700 hover:text-teal-900"><Sparkles size={17} /> See the full points guide</Link>
          </div>

          <div className="rounded-3xl border border-teal-200 bg-teal-900 p-6 text-white shadow-sm">
            <h2 className="text-xl font-black">Your next milestone</h2>
            <p className="mt-2 text-teal-100">{rank.nextMinimumPoints ? `Earn ${rank.pointsToNext} more points to reach the next rank.` : 'You have reached the highest rank. Keep learning to stay there!'}</p>
            <Link href="/activities-menu" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-black text-teal-950 transition hover:bg-amber-200">Find activities <ArrowRight size={17} /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}