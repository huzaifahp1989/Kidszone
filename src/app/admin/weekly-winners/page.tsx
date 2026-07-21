'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { formatWeekLabel, groupWinnersByWeek, type WeeklyWinnerAnnouncement } from '@/lib/weekly-winner-display';

const adminHeaders = { 'x-admin-auth': 'true' };

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
  const [autoPicking, setAutoPicking] = React.useState(false);
  const [setupRequired, setSetupRequired] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const [winnerName, setWinnerName] = React.useState('');
  const [madrasahName, setMadrasahName] = React.useState('');
  const [weekDate, setWeekDate] = React.useState(mondayOfWeek());

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth');
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
      setMessage(`Added ${data.winner.winner_name} for week of ${formatWeekLabel(data.winner.week_start_date)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save winner');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoPick = async (force = false) => {
    if (force && !window.confirm('Re-pick winners for the last completed week? This replaces the current auto-pick for that week.')) {
      return;
    }
    setAutoPicking(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/weekly-winners/pick', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Auto-pick failed');
      if (data.skipped) {
        setMessage(data.message || 'Winners were already picked for that week.');
      } else {
        const names = Array.isArray(data.winners)
          ? data.winners.map((w: { name: string }) => w.name).join(', ')
          : '';
        setMessage(data.message || `Picked winners: ${names}`);
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Auto-pick failed');
    } finally {
      setAutoPicking(false);
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
              Five winners are auto-picked each Saturday from Kids Zone activity. You can still add manual entries or run auto-pick now.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              ← Admin home
            </Button>
            <Button variant="outline" onClick={() => handleAutoPick(false)} disabled={autoPicking || setupRequired}>
              {autoPicking ? 'Picking…' : 'Auto-pick now'}
            </Button>
            <Button variant="outline" onClick={() => handleAutoPick(true)} disabled={autoPicking || setupRequired}>
              Force re-pick
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
              Run <code className="rounded bg-white px-1">SETUP_WEEKLY_WINNER_ANNOUNCEMENTS.sql</code> and{' '}
              <code className="rounded bg-white px-1">SETUP_AUTO_WEEKLY_WINNERS.sql</code> in the Supabase SQL editor, then refresh.
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
