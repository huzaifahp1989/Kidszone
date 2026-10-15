'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type StarsPayload = {
  quarterKey: string;
  starsThisQuarter: number;
  eligibleForQuarterlyDraw: boolean;
  monthlyStarMinPoints: number;
  quarterlyDrawMinStars: number;
  currentMonthlyPoints: number;
  months: Array<{
    key: string;
    isCurrent: boolean;
    points: number;
    starEarned: boolean;
    pointsToStar: number;
  }>;
};

type StarsProgressCardProps = {
  compact?: boolean;
};

export function StarsProgressCard({ compact = false }: StarsProgressCardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<StarsPayload | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rewards/stars?userId=${user.id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user?.id || !data) return null;

  const current = data.months.find((m) => m.isCurrent);
  const pointsToStar = current?.pointsToStar ?? Math.max(0, data.monthlyStarMinPoints - data.currentMonthlyPoints);

  return (
    <section className="feature-tile border-gold-200 bg-gradient-to-br from-gold-50 via-white to-teal-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold-700">
            <Star size={14} className="fill-gold-500 text-gold-500" /> Collect stars
          </p>
          <h3 className="mt-2 text-xl font-black text-sand-900">
            {data.starsThisQuarter} star{data.starsThisQuarter === 1 ? '' : 's'} this quarter
          </h3>
          <p className="mt-1 text-sm text-sand-600">
            {current?.starEarned
              ? `You earned this month's star. Collect ${data.quarterlyDrawMinStars}+ for the big prize draw.`
              : `${pointsToStar} more points this month for 1 star (${data.quarterKey}).`}
            {data.eligibleForQuarterlyDraw ? ' You are eligible for the draw!' : ''}
          </p>
          {!compact && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.months.map((m, idx) => (
                <span
                  key={m.key}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    m.starEarned
                      ? 'border-gold-300 bg-white text-gold-800'
                      : 'border-sand-200 bg-white/70 text-sand-600'
                  }`}
                >
                  Month {idx + 1}: {m.starEarned ? 'Star' : m.isCurrent ? `${m.points} pts` : '—'}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/stars"
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:from-teal-500 hover:to-teal-700"
        >
          View stars
        </Link>
      </div>
    </section>
  );
}
