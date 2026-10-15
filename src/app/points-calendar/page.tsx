'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';

type DayCell = {
  date: string;
  points: number;
  estimated: boolean;
  isToday: boolean;
};

type MonthRow = {
  key: string;
  label: string;
  points: number;
  isCurrent: boolean;
  source: string;
};

type CalendarPayload = {
  dailyCap: number;
  note: string;
  summary: {
    today: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
    selectedMonth: number;
    selectedYear: number;
  };
  month: {
    key: string;
    label: string;
    days: DayCell[];
  };
  year: {
    key: number;
    months: MonthRow[];
    total: number;
  };
};

type ViewMode = 'month' | 'year';

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function weekdayLabels() {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

/** Monday-first grid padding for a UTC YYYY-MM-DD list. */
function buildMonthGrid(days: DayCell[]): Array<DayCell | null> {
  if (!days.length) return [];
  const first = new Date(`${days[0].date}T12:00:00.000Z`);
  // JS: 0 Sun … 6 Sat → Monday-first offset
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cells: Array<DayCell | null> = Array.from({ length: mondayOffset }, () => null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function heatClass(points: number, cap: number): string {
  if (points <= 0) return 'border-sand-200 bg-white text-sand-400';
  const ratio = points / Math.max(1, cap);
  if (ratio >= 0.85) return 'border-teal-700 bg-teal-700 text-white';
  if (ratio >= 0.5) return 'border-teal-500 bg-teal-500 text-white';
  if (ratio >= 0.25) return 'border-teal-300 bg-teal-100 text-teal-900';
  return 'border-teal-200 bg-teal-50 text-teal-800';
}

export default function PointsCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const nowKey = useMemo(() => {
    const n = new Date();
    return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [monthKey, setMonthKey] = useState(nowKey);
  const [year, setYear] = useState(() => Number(nowKey.slice(0, 4)));
  const [view, setView] = useState<ViewMode>('month');
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      router.replace('/signin');
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const headers = await getAuthFetchHeaders();
        const res = await fetch(
          `/api/me/points-calendar?month=${encodeURIComponent(monthKey)}&year=${year}`,
          { cache: 'no-store', headers }
        );
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json?.error || 'Could not load points calendar');
          setData(null);
          return;
        }
        setData(json);
        setSelectedDay(null);
      } catch {
        if (active) {
          setError('Could not load points calendar');
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, user?.id, monthKey, year, router]);

  const grid = useMemo(() => buildMonthGrid(data?.month.days || []), [data?.month.days]);
  const dailyCap = data?.dailyCap ?? POINTS_DAILY_CAP;
  const maxMonthBar = Math.max(1, ...(data?.year.months.map((m) => m.points) || [1]));

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
          <Link href="/rewards" className="text-sm font-bold text-teal-700 hover:underline">
            Rewards →
          </Link>
        </div>

        <header className="page-header">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
            <CalendarDays size={14} /> Points calendar
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-sand-900 md:text-4xl">
            Your points by day, month &amp; year
          </h1>
          <p className="mt-2 max-w-2xl text-sand-600">
            See how much you earned today, browse a month day-by-day, and compare months across the year.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Today</p>
            <p className="mt-1 text-3xl font-black text-sand-900">
              {data?.summary.today ?? '—'}
              <span className="text-sm font-bold text-sand-500">/{dailyCap}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-sand-700">This month</p>
            <p className="mt-1 text-3xl font-black text-sand-900">{data?.summary.thisMonth ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-gradient-to-br from-sand-50 to-white p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-sand-600">This year</p>
            <p className="mt-1 text-3xl font-black text-sand-900">{data?.summary.thisYear ?? '—'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              view === 'month' ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
            }`}
          >
            Month days
          </button>
          <button
            type="button"
            onClick={() => setView('year')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              view === 'year' ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white text-sand-800'
            }`}
          >
            Year months
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700">
            {error}
          </p>
        )}

        {view === 'month' ? (
          <section className="surface-card space-y-4 rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => {
                  const next = shiftMonth(monthKey, -1);
                  setMonthKey(next);
                  setYear(Number(next.slice(0, 4)));
                }}
                className="rounded-xl border border-sand-200 bg-white p-2 text-sand-800 hover:bg-teal-50"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <h2 className="font-heading text-xl font-bold text-sand-900">{data?.month.label || monthKey}</h2>
                <p className="text-sm font-semibold text-teal-700">
                  {loading ? 'Loading…' : `${data?.summary.selectedMonth ?? 0} pts this month`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => {
                  const next = shiftMonth(monthKey, 1);
                  if (next > nowKey) return;
                  setMonthKey(next);
                  setYear(Number(next.slice(0, 4)));
                }}
                disabled={monthKey >= nowKey}
                className="rounded-xl border border-sand-200 bg-white p-2 text-sand-800 hover:bg-teal-50 disabled:opacity-40"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sand-600">
                <Loader2 className="animate-spin" size={20} /> Loading calendar…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-sand-500 sm:text-xs">
                  {weekdayLabels().map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {grid.map((cell, idx) => {
                    if (!cell) return <div key={`empty-${idx}`} className="min-h-[3.25rem] sm:min-h-[4rem]" />;
                    const dayNum = Number(cell.date.slice(8, 10));
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => setSelectedDay(cell)}
                        className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition sm:min-h-[4rem] ${heatClass(
                          cell.points,
                          dailyCap
                        )} ${cell.isToday ? 'ring-2 ring-gold-400 ring-offset-1' : ''} ${
                          selectedDay?.date === cell.date ? 'scale-[1.03] shadow-md' : ''
                        }`}
                      >
                        <span className="text-[10px] font-semibold opacity-80 sm:text-xs">{dayNum}</span>
                        <span className="text-sm font-black sm:text-base">{cell.points || '·'}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedDay && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3">
                    <p className="text-sm font-bold text-teal-900">
                      {selectedDay.date}
                      {selectedDay.isToday ? ' (today)' : ''}
                    </p>
                    <p className="mt-1 text-2xl font-black text-sand-900">
                      {selectedDay.points} <span className="text-sm font-bold text-sand-600">points</span>
                    </p>
                    <p className="mt-1 text-xs text-sand-600">
                      {selectedDay.isToday
                        ? 'Live total for today (daily cap applies).'
                        : 'Estimated from your logged activities that day.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <section className="surface-card space-y-4 rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => setYear((y) => y - 1)}
                className="rounded-xl border border-sand-200 bg-white p-2 text-sand-800 hover:bg-teal-50"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <h2 className="font-heading text-xl font-bold text-sand-900">{year}</h2>
                <p className="text-sm font-semibold text-teal-700">
                  {loading ? 'Loading…' : `${data?.year.total ?? 0} pts this year`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Next year"
                onClick={() => setYear((y) => Math.min(y + 1, Number(nowKey.slice(0, 4))))}
                disabled={year >= Number(nowKey.slice(0, 4))}
                className="rounded-xl border border-sand-200 bg-white p-2 text-sand-800 hover:bg-teal-50 disabled:opacity-40"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sand-600">
                <Loader2 className="animate-spin" size={20} /> Loading year…
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.year.months || []).map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => {
                      setMonthKey(row.key);
                      setView('month');
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white px-3 py-2.5 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                  >
                    <span className="w-28 shrink-0 text-sm font-bold text-sand-800 sm:w-36">
                      {row.label.split(' ')[0]}
                      {row.isCurrent ? ' ·' : ''}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-sand-100">
                      <div
                        className={`h-full rounded-full ${row.isCurrent ? 'bg-gradient-to-r from-teal-500 to-gold-400' : 'bg-teal-600'}`}
                        style={{ width: `${Math.max(row.points > 0 ? 4 : 0, Math.round((row.points / maxMonthBar) * 100))}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm font-black text-sand-900">{row.points}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {data?.note && (
          <p className="text-center text-xs text-sand-500">{data.note}</p>
        )}

        <p className="text-center text-sm text-sand-600">
          All-time points: <span className="font-black text-sand-900">{data?.summary.allTime ?? '—'}</span>
        </p>
      </div>
    </div>
  );
}
