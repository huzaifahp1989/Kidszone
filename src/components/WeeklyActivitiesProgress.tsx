'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BookOpen, CheckCircle2, Circle, Gamepad2, Mic, Sparkles, Star } from 'lucide-react';
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

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/rewards/weekly-activities?userId=${userId}`, { cache: 'no-store' });
        const json = await res.json();
        if (active && res.ok) {
          setData(json);
        }
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [userId]);

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

  if (!userId) return null;

  return (
    <>
      <WeeklyActivityPopup userId={userId} />
      <section className="mb-8 rounded-3xl border border-[#14b8a6]/25 bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdfa] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-[#ccfbf1] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0f766e]">
              Weekly 5 Activities Challenge
            </div>
            <h2 className="mt-3 text-2xl font-bold text-[#134e4a]">Finish 5 activities to enter the winner draw</h2>
            <p className="mt-2 text-sm text-[#0f766e] md:text-base">
              {loading
                ? 'Checking your weekly challenge progress...'
                : data?.qualifiedForDraw
                ? 'Amazing! You completed all 5 activities and are now in the weekly winner draw.'
                : `You have ${data?.remaining ?? 5} activit${(data?.remaining ?? 5) === 1 ? 'y' : 'ies'} left before going into the winner draw.`}
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center rounded-xl bg-[#14b8a6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0d9488]"
          >
            View Leaderboard
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-[#99f6e4] bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#115e59]">
            <span>{loading ? 'Loading progress...' : `${data?.completed ?? 0}/${data?.total ?? 5} activities done`}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[#ccfbf1]">
            <div className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            const count = Number(item.count || 0);
            const completed = count > 0;
            const inner = (
              <div className={`rounded-2xl border px-4 py-4 transition ${completed ? 'border-emerald-200 bg-emerald-50' : 'border-[#e5c9a3]/30 bg-white hover:border-[#14b8a6]/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${completed ? 'bg-emerald-600 text-white' : 'bg-[#f9f0e6] text-[#6a422d]'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#6a422d]">{item.label}</p>
                    <p className={`text-xs font-semibold ${completed ? 'text-emerald-700' : 'text-[#a1633a]'}`}>
                      {item.key === 'total' ? `${Math.min(5, count)}/5 done` : `${count} activit${count === 1 ? 'y' : 'ies'}`}
                    </p>
                  </div>
                  {completed ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} className="text-[#cbd5e1]" />}
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