'use client';

import Link from 'next/link';
import React from 'react';
import { ArrowLeft, CalendarDays, MapPin, Trophy } from 'lucide-react';
import {
  formatMonthlyWinnerMonth,
  getMonthlyWinnerArchiveMonths,
  type MonthlyWinner,
} from '@/lib/monthly-winners';

export default function MonthlyWinnersPage() {
  const [winners, setWinners] = React.useState<MonthlyWinner[]>([]);
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    const loadWinners = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/monthly-winners', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Could not load monthly winners.');
        if (!cancelled) setWinners(Array.isArray(data.winners) ? data.winners as MonthlyWinner[] : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load monthly winners.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadWinners();
    return () => {
      cancelled = true;
    };
  }, []);

  const months = React.useMemo(
    () => getMonthlyWinnerArchiveMonths(new Date(), '2026-10', winners.map((winner) => winner.month_key)),
    [winners]
  );
  const monthWinners = winners.filter((winner) => winner.month_key === selectedMonth);

  return (
    <main className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:space-y-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-4 py-2">
            <Trophy size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Monthly competition winners</span>
          </div>
          <h1 className="text-4xl font-black text-teal-950 md:text-5xl">Meet our winners</h1>
          <p className="mx-auto max-w-2xl text-lg text-sand-700">
            Celebrate the children taking part in our monthly competitions. Winners are added after each competition ends.
          </p>
          <p className="mx-auto max-w-2xl text-sm text-sand-600">
            Names and details appear here only when a parent or guardian has approved sharing them.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>

        <section className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-teal-900">
            <CalendarDays size={18} />
            <h2 className="font-bold">Choose a month</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {months.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => setSelectedMonth(month)}
                aria-pressed={selectedMonth === month}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  selectedMonth === month
                    ? 'bg-teal-700 text-white shadow'
                    : 'border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100'
                }`}
              >
                {formatMonthlyWinnerMonth(month)}
              </button>
            ))}
          </div>
        </section>

        <section aria-live="polite">
          <h2 className="mb-4 text-2xl font-black text-teal-950">{formatMonthlyWinnerMonth(selectedMonth)} winners</h2>
          {loading ? (
            <p className="rounded-2xl bg-white p-8 text-center text-sand-700">Loading winners…</p>
          ) : error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center font-semibold text-rose-800" role="alert">
              {error}
            </p>
          ) : monthWinners.length === 0 ? (
            <div className="rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-sm">
              <Trophy size={42} className="mx-auto mb-3 text-amber-400" />
              <p className="font-bold text-teal-950">No winners announced for this month yet.</p>
              <p className="mt-2 text-sm text-sand-700">
                The {formatMonthlyWinnerMonth(selectedMonth)} winners will be added after the competition ends.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {monthWinners.map((winner) => (
                <article key={winner.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Trophy size={24} />
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-teal-950">{winner.first_name}</h3>
                      <p className="mt-1 text-sm font-semibold text-sand-700">Age {winner.age_bracket}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-sand-600">
                        <MapPin size={14} /> {winner.city}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
