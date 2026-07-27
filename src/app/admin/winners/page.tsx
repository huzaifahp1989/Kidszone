'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { getQuarterKey } from '@/lib/leaderboard-rules';

const adminHeaders = { 'x-admin-auth': 'true' };

type PrizeWin = {
  id: string;
  user_id: string | null;
  period_type: string;
  period_key: string;
  display_name: string;
  points_at_win: number;
  weekly_points_at_win: number;
  monthly_points_at_win: number;
  stars_at_win: number;
  notes: string | null;
  created_at: string;
};

type EligibleKid = {
  userId: string;
  name: string;
  email: string | null;
  stars: number;
  months: string[];
  weight: number;
  pointsSum: number;
};

export default function AdminWinnersPage() {
  const router = useRouter();
  const [wins, setWins] = React.useState<PrizeWin[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'weekly' | 'monthly' | 'quarterly'>('all');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [setupRequired, setSetupRequired] = React.useState(false);

  const [quarterKey, setQuarterKey] = React.useState(getQuarterKey());
  const [eligible, setEligible] = React.useState<EligibleKid[]>([]);
  const [eligibleLoading, setEligibleLoading] = React.useState(false);
  const [picking, setPicking] = React.useState(false);

  const loadWins = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth');
      if (auth !== 'true') {
        router.push('/admin/login');
        return;
      }
      const qs = filter === 'all' ? '' : `?periodType=${filter}`;
      const res = await fetch(`/api/admin/prize-wins${qs}`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.setupRequired) {
        setSetupRequired(true);
        setWins([]);
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to load wins');
      setWins(Array.isArray(data.wins) ? data.wins : []);
      setSetupRequired(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  const loadEligible = React.useCallback(async () => {
    setEligibleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prize-wins', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quarterly-eligible', quarterKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load eligible kids');
      setEligible(Array.isArray(data.eligible) ? data.eligible : []);
      if (data.setupRequired) setSetupRequired(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load eligible');
    } finally {
      setEligibleLoading(false);
    }
  }, [quarterKey]);

  React.useEffect(() => {
    loadWins();
  }, [loadWins]);

  React.useEffect(() => {
    loadEligible();
  }, [loadEligible]);

  const pickWinner = async (userId?: string) => {
    if (!window.confirm(userId ? 'Record this kid as the quarterly winner?' : 'Run weighted quarterly draw?')) {
      return;
    }
    setPicking(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/prize-wins', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pick-quarterly',
          quarterKey,
          userId: userId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Pick failed');
      setMessage(
        `Quarterly winner: ${data.winner?.name} (${data.winner?.stars} stars). Frozen points saved.`
      );
      await loadWins();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pick failed');
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Winners &amp; points</h1>
            <p className="text-sm text-slate-600">
              Frozen points at win time, plus quarterly star draw eligibility.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              ← Admin home
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/weekly-winners')}>
              Weekly winners
            </Button>
            <Button variant="outline" onClick={loadWins} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {setupRequired && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Run <code className="rounded bg-white px-1">supabase/migrations/20260725_points_reliability_stars.sql</code> in
            Supabase, then refresh.
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quarterly prize draw</h2>
              <p className="text-sm text-slate-600">
                Eligible with 2+ monthly stars (150+ pts/month). 3 stars = 2× draw weight.
              </p>
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Quarter</span>
              <input
                value={quarterKey}
                onChange={(e) => setQuarterKey(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="2026-Q3"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={loadEligible} disabled={eligibleLoading} variant="outline">
              {eligibleLoading ? 'Loading…' : 'Refresh eligible'}
            </Button>
            <Button onClick={() => pickWinner()} disabled={picking || !eligible.length}>
              {picking ? 'Picking…' : 'Pick quarterly winner (weighted)'}
            </Button>
          </div>

          {eligible.length === 0 ? (
            <p className="text-sm text-slate-500">No eligible kids for {quarterKey} yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Stars</th>
                    <th className="px-3 py-2 text-left">Weight</th>
                    <th className="px-3 py-2 text-left">Months</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((kid) => (
                    <tr key={kid.userId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">{kid.name}</td>
                      <td className="px-3 py-2">{kid.stars}</td>
                      <td className="px-3 py-2">{kid.weight}×</td>
                      <td className="px-3 py-2">{kid.months.join(', ')}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-indigo-600 font-bold hover:underline"
                          onClick={() => pickWinner(kid.userId)}
                          disabled={picking}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Win history (frozen points)</h2>
            <div className="flex flex-wrap gap-2">
              {(['all', 'weekly', 'monthly', 'quarterly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
                    filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : wins.length === 0 ? (
            <p className="text-sm text-slate-500">No prize win records yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th className="px-3 py-2 text-left">Weekly</th>
                    <th className="px-3 py-2 text-left">Monthly</th>
                    <th className="px-3 py-2 text-left">Stars</th>
                    <th className="px-3 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {wins.map((w) => (
                    <tr key={w.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">{w.display_name}</td>
                      <td className="px-3 py-2 capitalize">{w.period_type}</td>
                      <td className="px-3 py-2">{w.period_key}</td>
                      <td className="px-3 py-2">{w.points_at_win}</td>
                      <td className="px-3 py-2">{w.weekly_points_at_win}</td>
                      <td className="px-3 py-2">{w.monthly_points_at_win}</td>
                      <td className="px-3 py-2">{w.stars_at_win || '—'}</td>
                      <td className="px-3 py-2">{new Date(w.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
