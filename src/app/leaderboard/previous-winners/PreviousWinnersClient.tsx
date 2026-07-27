'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, RefreshCw, Trophy } from 'lucide-react';
import { formatWeekLabel, groupWinnersByWeek, type WeeklyWinnerAnnouncement } from '@/lib/weekly-winner-display';

export default function PreviousWinnersClient() {
  const [winners, setWinners] = React.useState<WeeklyWinnerAnnouncement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadWinners = React.useCallback(async (soft = false) => {
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/weekly-winners?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load previous winners');
      setWinners(Array.isArray(data?.winners) ? data.winners : []);
    } catch (error) {
      console.error('Previous winners load error:', error);
      if (!soft) setWinners([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadWinners();
  }, [loadWinners]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      loadWinners(true);
    }, 30000);
    return () => window.clearInterval(id);
  }, [loadWinners]);

  const groupedWinners = React.useMemo(() => groupWinnersByWeek(winners), [winners]);

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:space-y-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#fffbeb] px-4 py-2">
            <Trophy size={16} className="text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#b45309]">Competition Winners Archive</span>
          </div>
          <h1 className="text-4xl font-bold text-[#1e1b4b] md:text-5xl">Previous Winners</h1>
          <p className="text-lg text-[#475569]">
            See past winners and their live monthly points as the leaderboard updates.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-5 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-50"
            >
              <ArrowLeft size={18} />
              Back to Leaderboard
            </Link>
            <button
              type="button"
              onClick={() => loadWinners(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-100"
              disabled={refreshing}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#7c3aed]/30 bg-gradient-to-r from-[#ecfeff] to-[#f5f3ff] p-5 text-center">
          <p className="text-base font-bold text-[#5b21b6] md:text-lg">
            Winner points now come from the live leaderboard profile when a match is found.
          </p>
          <p className="mt-2 text-sm text-[#5b21b6] md:text-base">
            This page refreshes automatically, so weekly, monthly, and total points stay up to date.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#c4b5fd]/30 bg-white p-8 shadow-lg">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#ede9fe]" />
              ))}
            </div>
          </div>
        ) : groupedWinners.length === 0 ? (
          <div className="rounded-2xl border border-[#c4b5fd]/30 bg-white p-8 text-center shadow-lg">
            <CalendarDays size={48} className="mx-auto mb-4 text-[#c4b5fd]" />
            <p className="font-semibold text-[#1e1b4b]">No winners added yet</p>
            <p className="text-[#475569]">Winners will appear here once they are announced.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedWinners.map(({ weekStartDate, winners: weekWinners }) => (
              <section
                key={weekStartDate}
                className="overflow-hidden rounded-2xl border border-[#c4b5fd]/30 bg-white shadow-lg"
              >
                <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-6 py-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/80">Week of</p>
                  <h2 className="text-xl font-bold">{formatWeekLabel(weekStartDate)}</h2>
                </div>

                <div className="divide-y divide-[#c4b5fd]/20">
                  {weekWinners.map((winner) => (
                    <div key={winner.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="text-lg font-black text-[#1e1b4b]">{winner.winner_name}</p>
                        <p className="text-sm text-[#475569]">
                          {winner.madrasah_name?.trim() || 'No madrasah listed'}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:min-w-[18rem]">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Week</p>
                          <p className="text-xl font-black text-amber-900">
                            {winner.weekly_points != null ? winner.weekly_points : '—'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Month</p>
                          <p className="text-xl font-black text-violet-900">
                            {winner.monthly_points != null ? winner.monthly_points : '—'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Total</p>
                          <p className="text-xl font-black text-sky-900">
                            {winner.total_points != null ? winner.total_points : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
