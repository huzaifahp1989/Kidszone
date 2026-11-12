'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import {
  MONTHLY_WINNER_AGE_BRACKETS,
  formatMonthlyWinnerMonth,
  type MonthlyWinnerAgeBracket,
} from '@/lib/monthly-winners';
import { formatWeekLabel, groupWinnersByWeek, type WeeklyWinnerAnnouncement } from '@/lib/weekly-winner-display';

const adminHeaders = { 'x-admin-auth': 'true' };

type LearnerResult = {
  uid: string;
  name: string;
  email?: string | null;
  cityNormalized?: string | null;
  ageNormalized?: number | null;
};

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || '';

const bracketForAge = (age: number | null | undefined): MonthlyWinnerAgeBracket | null => {
  if (age == null || !Number.isFinite(age)) return null;
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  if (age <= 12) return '11-12';
  return '13-14';
};

function mondayOfWeek(input = new Date()): string {
  const d = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function AdminWeeklyWinnersPage() {
  const router = useRouter();
  const [winners, setWinners] = React.useState<WeeklyWinnerAnnouncement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [setupRequired, setSetupRequired] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const [winnerName, setWinnerName] = React.useState('');
  const [madrasahName, setMadrasahName] = React.useState('');
  const [weekDate, setWeekDate] = React.useState(mondayOfWeek());

  const [learnerQuery, setLearnerQuery] = React.useState('');
  const [learnerResults, setLearnerResults] = React.useState<LearnerResult[]>([]);
  const [learnerSearching, setLearnerSearching] = React.useState(false);
  const [linkedLearner, setLinkedLearner] = React.useState<{ uid: string; name: string } | null>(null);
  const [monthlyAgeBracket, setMonthlyAgeBracket] = React.useState<MonthlyWinnerAgeBracket>('8-10');
  const [monthlyCity, setMonthlyCity] = React.useState('');
  const [syncMonthly, setSyncMonthly] = React.useState(false);

  React.useEffect(() => {
    const trimmed = learnerQuery.trim();
    if (trimmed.length < 2) {
      setLearnerResults([]);
      setLearnerSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLearnerSearching(true);
      try {
        const response = await fetch(`/api/admin/users?q=${encodeURIComponent(trimmed)}`, {
          headers: adminHeaders,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Search failed');
        const users = Array.isArray(data.users) ? data.users : [];
        setLearnerResults(users.slice(0, 8) as LearnerResult[]);
      } catch {
        setLearnerResults([]);
      } finally {
        setLearnerSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [learnerQuery]);

  const selectLearner = (learner: LearnerResult) => {
    setLinkedLearner({ uid: learner.uid, name: learner.name });
    setWinnerName((previous) => previous || learner.name);
    const bracket = bracketForAge(learner.ageNormalized);
    if (bracket) setMonthlyAgeBracket(bracket);
    const city = String(learner.cityNormalized || '').trim();
    if (city) setMonthlyCity(city);
    setLearnerQuery('');
    setLearnerResults([]);
  };

  const clearLearner = () => {
    setLinkedLearner(null);
    setSyncMonthly(false);
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth') || localStorage.getItem('admin_auth');
      if (auth !== 'true') {
        router.push('/admin/login');
        return;
      }

      const res = await fetch('/api/admin/weekly-winners', {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.setupRequired) {
        setSetupRequired(true);
        setWinners([]);
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to load winners');
      setWinners(Array.isArray(data.winners) ? data.winners : []);
      setSetupRequired(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load winners');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/weekly-winners', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerName: winnerName.trim(),
          madrasahName: madrasahName.trim(),
          weekStartDate: weekDate,
          ...(linkedLearner && syncMonthly
            ? {
                userId: linkedLearner.uid,
                syncMonthly: true,
                firstName: firstNameOf(winnerName) || firstNameOf(linkedLearner.name),
                ageBracket: monthlyAgeBracket,
                city: monthlyCity.trim(),
              }
            : {}),
        }),
      });
      const data = await res.json();

      if (data?.setupRequired) {
        setSetupRequired(true);
        throw new Error(data?.error || 'Database table missing');
      }
      if (!res.ok) throw new Error(data?.error || 'Could not save winner');

      setWinners((prev) => [data.winner, ...prev]);
      setWinnerName('');
      setMadrasahName('');
      setLinkedLearner(null);
      setSyncMonthly(false);
      setMonthlyCity('');

      let summary = `Added ${data.winner.winner_name} for week of ${formatWeekLabel(data.winner.week_start_date)}`;
      if (data.monthlyWinner) {
        summary += ` and added to the ${formatMonthlyWinnerMonth(String(data.monthlyWinner.month_key))} Monthly winners page (leaderboard tick enabled)`;
      }
      setMessage(summary);
      if (data.monthlyError) setError(data.monthlyError);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save winner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this winner entry?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/weekly-winners?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not delete');
      setWinners((prev) => prev.filter((w) => w.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  const grouped = React.useMemo(() => groupWinnersByWeek(winners), [winners]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Weekly Winners</h1>
            <p className="text-sm text-slate-600">
              Choose and manage weekly winners manually.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              ← Admin home
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {setupRequired && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Database setup required</p>
            <p className="mt-1">
              Run <code className="rounded bg-white px-1">SETUP_WEEKLY_WINNER_ANNOUNCEMENTS.sql</code> in the Supabase SQL editor, then refresh.
            </p>
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Add winner</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick the week start date (usually the Saturday or Monday your competition week begins). You can add multiple winners for the same week.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Winner name</span>
              <input
                value={winnerName}
                onChange={(e) => setWinnerName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. Aisha Khan"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Madrasah</span>
              <input
                value={madrasahName}
                onChange={(e) => setMadrasahName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. Green Lane Masjid"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Week date</span>
              <input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <span className="mt-1 block text-xs text-slate-500">
                Week shown as {weekDate ? formatWeekLabel(weekDate) : '—'}
              </span>
            </label>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Link a learner (optional)</span>
              <p className="text-xs text-slate-500">
                Search by name, email or username. Linking lets the winner also appear on the Monthly winners page and show the ✓ tick on the leaderboard.
              </p>

              {linkedLearner ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{linkedLearner.name}</p>
                    <p className="text-xs text-emerald-700">Linked learner</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearLearner}
                    className="text-sm font-semibold text-emerald-800 hover:text-emerald-900"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <input
                    value={learnerQuery}
                    onChange={(e) => setLearnerQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Search learners by name, email or username"
                  />
                  {learnerSearching && <p className="mt-2 text-xs text-slate-500">Searching…</p>}
                  {learnerResults.length > 0 && (
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {learnerResults.map((learner) => (
                        <li key={learner.uid} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{learner.name}</p>
                            <p className="truncate text-xs text-slate-500">
                              {[learner.email, learner.cityNormalized].filter(Boolean).join(' · ') || 'Learner'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectLearner(learner)}
                            className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                          >
                            Link
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!learnerSearching && learnerQuery.trim().length >= 2 && learnerResults.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">No learners found.</p>
                  )}
                </div>
              )}

              {linkedLearner && (
                <div className="mt-3 space-y-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={syncMonthly}
                      onChange={(e) => setSyncMonthly(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-700">
                      Also add to the Monthly winners page (adds the ✓ tick on the leaderboard)
                    </span>
                  </label>

                  {syncMonthly && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Age bracket</span>
                        <select
                          value={monthlyAgeBracket}
                          onChange={(e) => setMonthlyAgeBracket(e.target.value as MonthlyWinnerAgeBracket)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          {MONTHLY_WINNER_AGE_BRACKETS.map((bracket) => (
                            <option key={bracket} value={bracket}>
                              {bracket}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">City</span>
                        <input
                          value={monthlyCity}
                          onChange={(e) => setMonthlyCity(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="e.g. Birmingham"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving || setupRequired}>
                {saving ? 'Saving…' : 'Add winner'}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">All winners</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : grouped.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No winners added yet.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {grouped.map(({ weekStartDate, winners: weekWinners }) => (
                <div key={weekStartDate} className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                    Week of {formatWeekLabel(weekStartDate)}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {weekWinners.map((w) => (
                      <li
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 border border-sky-100"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{w.winner_name}</p>
                          {w.madrasah_name ? (
                            <p className="text-sm text-slate-600">{w.madrasah_name}</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">No madrasah listed</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
