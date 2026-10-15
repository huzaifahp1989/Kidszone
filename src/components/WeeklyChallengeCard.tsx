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
    <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-sand-50 p-6 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-800">
            <Sparkles size={14} />
            Weekly theme
          </div>
          <h3 className="mt-3 flex items-center gap-2 text-2xl font-bold text-sand-900">
            <span>{challenge.theme.icon}</span>
            {challenge.theme.title}
          </h3>
          <p className="mt-1 text-sm text-sand-600">{challenge.theme.description}</p>
        </div>

        <div className="min-w-[140px] rounded-2xl border border-teal-100 bg-white px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Progress</p>
          <p className="text-3xl font-black text-teal-800">
            {challenge.progress}/{challenge.target}
          </p>
          <p className="text-xs text-sand-500">{challenge.theme.unit} this week</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm text-sand-700">
          <span>{percent}% complete</span>
          {challenge.badgeEarned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
              <Award size={12} />
              {challenge.badgeName} earned
            </span>
          ) : (
            <span className="text-xs text-sand-500">Badge: {challenge.badgeName}</span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-sand-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-gold-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={challenge.theme.href}
          className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-600"
        >
          Continue challenge →
        </Link>
      </div>
    </section>
  );
}
