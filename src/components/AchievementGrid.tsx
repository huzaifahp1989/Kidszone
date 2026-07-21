'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { computeAchievements, type ActivitySummary, type AchievementStatus } from '@/lib/achievements';

const EMPTY_SUMMARY = (profile?: { streak?: number; points?: number } | null): ActivitySummary => ({
  quizCount: 0,
  gameCount: 0,
  salahDays: 0,
  streak: profile?.streak ?? 0,
  totalPoints: profile?.points ?? 0,
  habitDays: 0,
  sadaqahCount: 0,
});

const CATEGORY_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  habits: 'Habits',
  sadaqah: 'Sadaqah',
  general: 'All-rounder',
};

export function AchievementGrid({ compact = false }: { compact?: boolean }) {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSummary(EMPTY_SUMMARY(profile));
      return;
    }

    let active = true;
    fetch(`/api/user/activity-calendar?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.stats) {
          setSummary({
            ...EMPTY_SUMMARY(profile),
            ...(data.stats as Partial<ActivitySummary>),
          });
        } else {
          setSummary(EMPTY_SUMMARY(profile));
        }
      })
      .catch(() => {
        if (active) setSummary(EMPTY_SUMMARY(profile));
      });

    return () => {
      active = false;
    };
  }, [user?.id, profile?.streak, profile?.points]);

  const achievements = useMemo<AchievementStatus[]>(() => {
    if (!summary) return [];
    return computeAchievements(summary);
  }, [summary]);

  const unlocked = achievements.filter((a) => a.unlocked).length;

  const byCategory = useMemo(() => {
    const groups: Record<string, AchievementStatus[]> = {};
    for (const a of achievements) {
      (groups[a.category] ||= []).push(a);
    }
    return groups;
  }, [achievements]);

  if (!summary) {
    return (
      <section className="surface-card rounded-2xl p-4">
        <p className="text-sm text-sand-600">Loading badge gallery…</p>
      </section>
    );
  }

  if (compact) {
    return (
      <section className="surface-card rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Badge gallery</p>
          <p className="text-xs font-semibold text-amber-700">{unlocked}/{achievements.length} unlocked</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a.id}
              title={a.description}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                a.unlocked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 grayscale opacity-60'
              }`}
            >
              <span>{a.emoji}</span>
              <span>{a.label}</span>
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Collectibles</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-sand-900">Badge gallery</h3>
          <p className="mt-1 text-sm text-sand-600">
            {unlocked} of {achievements.length} unlocked — habits, quizzes & sadaqah!
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
              {CATEGORY_LABELS[category] || category}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((a) => (
                <div
                  key={a.id}
                  title={a.description}
                  className={`rounded-2xl border p-4 text-center transition ${
                    a.unlocked
                      ? 'border-amber-300 bg-white shadow-sm'
                      : 'border-gray-200 bg-gray-50 opacity-70 grayscale'
                  }`}
                >
                  <div className="text-3xl">{a.emoji}</div>
                  <p className="mt-2 text-sm font-bold text-sand-900">{a.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-sand-600">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
