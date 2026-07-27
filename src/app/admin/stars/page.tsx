'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components';

type AdminStarEntry = {
  uid: string;
  name: string;
  email: string | null;
  activeDays: number;
  weeklyStars: number;
  maxWeeklyStars: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalPoints: number;
};

type AdminStarsResponse = {
  week: {
    weekStartDate: string;
    weekEndDate: string;
  };
  thresholds: number[];
  entries: AdminStarEntry[];
};

type AdminStarHistoryEntry = {
  uid: string;
  name: string;
  email: string | null;
  weekStartDate: string;
  weekEndDate: string;
  activeDays: number;
  weeklyStars: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalPoints: number;
};

function starsView(stars: number, maxStars: number): string {
  return Array.from({ length: maxStars }, (_, idx) => (idx < stars ? '⭐' : '☆')).join(' ');
}

export default function AdminStarsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminStarsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [history, setHistory] = useState<AdminStarHistoryEntry[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth') || localStorage.getItem('admin_auth');
      if (auth !== 'true') {
        router.push('/admin/login');
        return;
      }

      const res = await fetch('/api/admin/stars?limit=400', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load stars');
      setData(json);

      setHistoryLoading(true);
      const historyRes = await fetch('/api/admin/stars/history?limit=600', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const historyJson = await historyRes.json();
      if (!historyRes.ok) throw new Error(historyJson?.error || 'Failed to load stars history');
      setSetupRequired(Boolean(historyJson?.setupRequired));
      setHistory(Array.isArray(historyJson?.entries) ? historyJson.entries : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load stars');
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const ruleText = useMemo(() => {
    const t = data?.thresholds || [2, 4, 6];
    return `${t[0]} days = 1 star, ${t[1]} days = 2 stars, ${t[2]} days = 3 stars`;
  }, [data?.thresholds]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Weekly Stars Admin</h1>
            <p className="text-sm text-slate-600">Per user weekly stars with monthly and total points.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>← Admin home</Button>
            <Button variant="outline" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Star Rule</p>
          <p>{ruleText}</p>
          {data?.week ? (
            <p className="mt-1 text-xs">Week: {data.week.weekStartDate} to {data.week.weekEndDate}</p>
          ) : null}
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        ) : null}

        {setupRequired ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Weekly stars history table is not set up yet. Run migration: supabase/migrations/20260727_weekly_star_snapshots.sql
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3 text-right">Active days</th>
                  <th className="px-3 py-3">Weekly stars</th>
                  <th className="px-3 py-3 text-right">Week pts</th>
                  <th className="px-3 py-3 text-right">Monthly pts</th>
                  <th className="px-3 py-3 text-right">Total pts</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Loading stars…</td>
                  </tr>
                ) : null}
                {!loading && (data?.entries || []).length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>No users found.</td>
                  </tr>
                ) : null}
                {!loading && (data?.entries || []).map((entry) => (
                  <tr key={entry.uid} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-900">{entry.name}</td>
                    <td className="px-3 py-3 text-slate-600">{entry.email || '—'}</td>
                    <td className="px-3 py-3 text-right font-bold text-violet-800">{entry.activeDays}</td>
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-900">
                        <Star size={14} />
                        <span className="font-bold">{entry.weeklyStars}/{entry.maxWeeklyStars}</span>
                        <span className="text-xs">{starsView(entry.weeklyStars, entry.maxWeeklyStars)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">{entry.weeklyPoints}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">{entry.monthlyPoints}</td>
                    <td className="px-3 py-3 text-right font-black text-slate-900">{entry.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-lg font-bold text-slate-900">Weekly Stars History</h2>
            <p className="text-xs text-slate-600">Snapshot taken at weekly reset before weekly points are cleared.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3">Week</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3 text-right">Days</th>
                  <th className="px-3 py-3 text-right">Stars</th>
                  <th className="px-3 py-3 text-right">Week pts</th>
                  <th className="px-3 py-3 text-right">Month pts</th>
                  <th className="px-3 py-3 text-right">Total pts</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Loading history…</td>
                  </tr>
                ) : null}
                {!historyLoading && history.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>No weekly history yet.</td>
                  </tr>
                ) : null}
                {!historyLoading && history.map((entry, idx) => (
                  <tr key={`${entry.uid}-${entry.weekStartDate}-${idx}`} className="border-t border-slate-100">
                    <td className="px-3 py-3 text-xs font-semibold text-slate-700">{entry.weekStartDate} to {entry.weekEndDate}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{entry.name}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{entry.activeDays}</td>
                    <td className="px-3 py-3 text-right font-bold text-amber-800">{entry.weeklyStars}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{entry.weeklyPoints}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{entry.monthlyPoints}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{entry.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
