'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function weekdayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' });
}

function dayOfMonth(dateKey: string): number {
  return parseInt(dateKey.slice(8, 10), 10);
}

export function StreakCalendar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const days = useMemo(() => lastNDays(compact ? 14 : 28), [compact]);
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(Boolean(user?.id));

  useEffect(() => {
    if (!user?.id) {
      setActiveSet(new Set());
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    fetch(`/api/user/activity-calendar?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const dates = Array.isArray(data?.activeDates) ? data.activeDates : [];
        setActiveSet(new Set(dates.map(String)));
      })
      .catch(() => {
        if (active) setActiveSet(new Set());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const activeCount = days.filter((d) => activeSet.has(d)).length;

  return (
    <section className={`surface-card rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50 ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
            {compact ? 'Learning streak' : 'Activity calendar'}
          </p>
          {!compact && (
            <h3 className="mt-1 font-heading text-lg font-bold text-sand-900">Last 28 days</h3>
          )}
        </div>
        <p className="text-sm font-bold text-violet-700">
          {loading ? '…' : `${activeCount} active day${activeCount === 1 ? '' : 's'}`}
        </p>
      </div>
      <div className={`mt-4 grid gap-1.5 ${compact ? 'grid-cols-7' : 'grid-cols-7 sm:grid-cols-14'}`}>
        {days.map((dateKey) => {
          const isActive = activeSet.has(dateKey);
          const isToday = dateKey === days[days.length - 1];
          return (
            <div
              key={dateKey}
              title={dateKey}
              className={`flex flex-col items-center justify-center rounded-lg border px-1 py-2 text-center ${
                isActive
                  ? 'border-violet-400 bg-violet-500 text-white'
                  : 'border-violet-100 bg-white text-sand-500'
              } ${isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
            >
              {!compact && (
                <span className="text-[9px] font-semibold uppercase opacity-80">{weekdayLabel(dateKey)}</span>
              )}
              <span className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>{dayOfMonth(dateKey)}</span>
            </div>
          );
        })}
      </div>
      {!user?.id && (
        <p className="mt-3 text-xs text-sand-600">Sign in to track your learning days.</p>
      )}
    </section>
  );
}
