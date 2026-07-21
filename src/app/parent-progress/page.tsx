'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Trophy } from 'lucide-react';

type ParentProgressResponse = {
  child: {
    id: string;
    name: string;
    email: string | null;
  };
  points: {
    total_points: number;
    weekly_points: number;
    monthly_points: number;
    today_points: number;
    badges: number;
    level: number;
  };
  activity: {
    weeklyQuizAttempts: number;
    monthlyQuizAttempts: number;
    monthlyPledgeLogs: number;
    monthlyGameSessions: number;
  };
  certificates: {
    qualifiedMonths: number;
    recent: Array<{
      month_start: string;
      total_activities: number;
      certificate_qualified: boolean;
    }>;
  };
  featureLab: {
    week: {
      activeDays: number;
      totalGoodDeeds: number;
      challengeDays: number;
    };
    recent: Array<{
      date: string;
      goodDeedsCount: number;
      challengeTitle: string | null;
    }>;
  };
};

export default function ParentProgressPage() {
  const [token, setToken] = useState('');
  const [childId, setChildId] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParentProgressResponse | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || '';
    const urlChildId = params.get('childId') || '';
    const urlChildEmail = params.get('childEmail') || '';
    const urlParentEmail = params.get('parentEmail') || '';
    if (urlToken) setToken(urlToken);
    if (urlChildId) setChildId(urlChildId);
    if (urlChildEmail) setChildEmail(urlChildEmail);
    if (urlParentEmail) setParentEmail(urlParentEmail);
  }, []);

  const canSubmit = useMemo(() => {
    if (token.trim()) return true;
    return Boolean(parentEmail.trim()) && Boolean(childId.trim() || childEmail.trim());
  }, [childEmail, childId, parentEmail, token]);

  useEffect(() => {
    if (!token.trim()) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch('/api/parent/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || 'Could not load progress from secure link');
        }

        setData(payload);
      } catch (err: any) {
        setError(err?.message || 'Secure link is invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const loadProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/parent/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim() || undefined,
          childId: childId.trim() || undefined,
          childEmail: childEmail.trim() || undefined,
          parentEmail: parentEmail.trim().toLowerCase(),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Could not load progress');
      }

      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parent progress.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 px-4 py-8">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-cyan-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                <ShieldCheck size={14} /> Parent View
              </p>
              <h1 className="mt-3 text-2xl md:text-3xl font-black text-slate-900">Child Progress (Read-only)</h1>
              <p className="mt-2 text-sm text-slate-600">Use your parent email and your child account details to view progress safely.</p>
            </div>
            <Link href="/profile" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Back to Profile
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {token ? (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              Secure one-time link detected. It is consumed when opened successfully.
            </div>
          ) : (
            <form onSubmit={loadProgress} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                placeholder="Child User ID (optional if email used)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="email"
                value={childEmail}
                onChange={(e) => setChildEmail(e.target.value)}
                placeholder="Child Email (optional if ID used)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="Parent Email"
                required
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-cyan-500"
                >
                  {loading ? 'Loading...' : 'View Progress'}
                </button>
              </div>
            </form>
          )}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        {data ? (
          <>
            <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">{data.child.name}</h2>
              <p className="text-sm text-slate-600">{data.child.email || data.child.id}</p>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-slate-500">Total Points</p>
                  <p className="text-2xl font-black text-emerald-700">{data.points.total_points}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-slate-500">Level</p>
                  <p className="text-2xl font-black text-indigo-700">{data.points.level}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-slate-500">Badges</p>
                  <p className="text-2xl font-black text-amber-600">{data.points.badges}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-slate-500">Today</p>
                  <p className="text-2xl font-black text-cyan-700">{data.points.today_points}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-slate-900">Activity (Last 30 days)</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>Weekly quiz attempts: <strong>{data.activity.weeklyQuizAttempts}</strong></p>
                  <p>Monthly quiz attempts: <strong>{data.activity.monthlyQuizAttempts}</strong></p>
                  <p>Pledge logs: <strong>{data.activity.monthlyPledgeLogs}</strong></p>
                  <p>Game sessions: <strong>{data.activity.monthlyGameSessions}</strong></p>
                </div>
              </article>

              <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
                <h3 className="font-black text-violet-900">Feature Lab (Last 7 days)</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-white border border-violet-100 p-2">
                    <p className="text-xs text-violet-600">Active Days</p>
                    <p className="text-xl font-black text-violet-900">{data.featureLab.week.activeDays}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-violet-100 p-2">
                    <p className="text-xs text-violet-600">Good Deeds</p>
                    <p className="text-xl font-black text-violet-900">{data.featureLab.week.totalGoodDeeds}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-violet-100 p-2">
                    <p className="text-xs text-violet-600">Challenges</p>
                    <p className="text-xl font-black text-violet-900">{data.featureLab.week.challengeDays}</p>
                  </div>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-900">Recent Feature Lab Days</h3>
                <p className="text-xs text-slate-500">Most recent 14 days</p>
              </div>
              {(data.featureLab.recent || []).length > 0 ? (
                <div className="mt-3 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Good Deeds</th>
                        <th className="px-3 py-2 text-left">Challenge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.featureLab.recent.map((row) => (
                        <tr key={row.date} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.date}</td>
                          <td className="px-3 py-2 text-slate-700">{row.goodDeedsCount}</td>
                          <td className="px-3 py-2 text-slate-700">{row.challengeTitle || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} />
                  No recent feature-lab activity found.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <Trophy size={18} /> Certificate Progress
              </div>
              <p className="mt-2 text-sm text-amber-900">
                Qualified months in last year: <strong>{data.certificates.qualifiedMonths}</strong>
              </p>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
