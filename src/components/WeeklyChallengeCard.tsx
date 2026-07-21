'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

type ChallengePayload = {
  weekStartDate: string;
  weekEndDate: string;
  theme: {
    key: string;
    title: string;
    description: string;
    href: string;
    icon: string;
    target: number;
    unit: string;
    badgeName: string;
  };
  progress: number;
  target: number;
  completed: boolean;
  badgeEarned: boolean;
  badgeName: string;
};

export function WeeklyChallengeCard() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<ChallengePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setChallenge(null);
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      try {
        const headers = await getAuthFetchHeaders();
        const res = await fetch(`/api/weekly-challenge?userId=${user.id}`, { cache: 'no-store', headers });
        const data = await res.json();
        if (active && res.ok) setChallenge(data.challenge);
      } catch {
        if (active) setChallenge(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user || loading) return null;
  if (!challenge) return null;

  const percent = challenge.target > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
            <Sparkles size={14} />
            Weekly theme
          </div>
          <h3 className="mt-3 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span>{challenge.theme.icon}</span>
            {challenge.theme.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{challenge.theme.description}</p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-center min-w-[140px]">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Progress</p>
          <p className="text-3xl font-black text-indigo-700">
            {challenge.progress}/{challenge.target}
          </p>
          <p className="text-xs text-slate-500">{challenge.theme.unit} this week</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
          <span>{percent}% complete</span>
          {challenge.badgeEarned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <Award size={12} />
              {challenge.badgeName} earned
            </span>
          ) : (
            <span className="text-xs text-slate-500">Badge: {challenge.badgeName}</span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={challenge.theme.href}
          className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
        >
          Continue challenge →
        </Link>
      </div>
    </section>
  );
}
