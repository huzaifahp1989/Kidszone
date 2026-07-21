'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { formatDonationAmount } from '@/lib/donations';
import type { DonationLeaderboardEntry } from '@/types/donation';
import { Heart, Trophy } from 'lucide-react';

type Period = 'week' | 'month' | 'all';
type Sort = 'count' | 'amount';

export default function DonationLeaderboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const [sort, setSort] = useState<Sort>('count');
  const [leaders, setLeaders] = useState<DonationLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/donations/leaderboard?period=${period}&sort=${sort}`,
        { cache: 'no-store' }
      );
      const payload = await res.json();

      if (payload?.setupRequired) {
        setSetupRequired(true);
        setLeaders([]);
        return;
      }

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Could not load leaderboard');
      }

      setLeaders(Array.isArray(payload.leaders) ? payload.leaders : []);
      setSetupRequired(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load leaderboard');
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  }, [period, sort]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const periodLabel =
    period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'All time';

  return (
    <div className="page-inner pb-24">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Trophy size={28} />
          </div>
          <h1 className="text-3xl font-black text-emerald-950">Sadaqah Leaderboard</h1>
          <p className="mt-2 text-sm text-emerald-900/80">
            See who is leading in charity and kindness on Kids Zone — {periodLabel.toLowerCase()}.
          </p>
        </section>

        {setupRequired && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Database setup required</p>
            <p className="mt-1">
              Run <code className="rounded bg-white px-1">SETUP_KIDS_DONATIONS.sql</code> in Supabase, then refresh.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {([
            ['week', 'This week'],
            ['month', 'This month'],
            ['all', 'All time'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                period === key
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setSort('count')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              sort === 'count'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            Most kind acts
          </button>
          <button
            type="button"
            onClick={() => setSort('amount')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              sort === 'amount'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            Most money given
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-h-[280px]">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-4xl animate-pulse">⏳</div>
          ) : error ? (
            <div className="py-10 text-center text-red-600">
              <p className="font-bold">Could not load leaderboard</p>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
            </div>
          ) : leaders.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              <Heart className="mx-auto mb-3 text-emerald-400" size={32} />
              <p className="text-lg font-semibold">No sadaqah logged yet!</p>
              <p className="mt-1 text-sm">Be the first to log a good deed.</p>
              <Link
                href="/donations"
                className="mt-4 inline-block font-bold text-emerald-700 underline"
              >
                Log your first sadaqah
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => (
                <div
                  key={leader.userId}
                  className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-4 ${
                    index === 0
                      ? 'border-yellow-200 bg-yellow-50'
                      : index === 1
                        ? 'border-slate-200 bg-slate-50'
                        : index === 2
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-black ${
                        index === 0
                          ? 'bg-yellow-400 text-white'
                          : index === 1
                            ? 'bg-slate-400 text-white'
                            : index === 2
                              ? 'bg-orange-400 text-white'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
                        <span>{leader.name}</span>
                        {leader.winnerTick && (
                          <span aria-label="Weekly winner" className="text-emerald-600">
                            ✓
                          </span>
                        )}
                      </p>
                      {leader.madrasahName ? (
                        <p className="text-sm text-slate-500">{leader.madrasahName}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Kids Zone learner</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">
                      {sort === 'amount'
                        ? formatDonationAmount(leader.totalAmountPence)
                        : leader.donationCount}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {sort === 'amount' ? 'Total given' : 'Kind acts'}
                    </p>
                    {sort === 'count' && leader.totalAmountPence > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDonationAmount(leader.totalAmountPence)} given
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push('/donations')}>
            Log sadaqah
          </Button>
          <Button variant="outline" onClick={() => router.push('/leaderboard')}>
            Points leaderboard
          </Button>
        </div>
      </main>
    </div>
  );
}
