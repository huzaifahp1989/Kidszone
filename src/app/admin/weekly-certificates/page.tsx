'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';

const adminHeaders = { 'x-admin-auth': 'true' } as const;

type PreviewAward = {
  userId: string;
  name: string;
  rank: number;
  tier: string;
  weeklyPoints: number;
  weeklyActivityCount: number;
  weeklyScore: number;
  points_to_award: number;
};

type HistoryWeek = {
  week_start_date: string;
  count: number;
  rows: any[];
};

export default function AdminWeeklyCertificatesPage() {
  const router = useRouter();
  const [week, setWeek] = React.useState<string>(() => getScoreWeekRangeUtc().weekStartIso);
  const [gold, setGold] = React.useState<number>(1);
  const [silver, setSilver] = React.useState<number>(1);
  const [bronze, setBronze] = React.useState<number>(1);
  const [participation, setParticipation] = React.useState<number>(100);
  const [issuedBy, setIssuedBy] = React.useState<string>('Admin');
  const [preview, setPreview] = React.useState<PreviewAward[]>([]);
  const [candidateCount, setCandidateCount] = React.useState<number>(0);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [issueLoading, setIssueLoading] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryWeek[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadPreview = React.useCallback(async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        week,
        gold: String(gold),
        silver: String(silver),
        bronze: String(bronze),
        participation: String(participation),
      });
      const res = await fetch(`/api/admin/weekly-certificates?${qs.toString()}`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load preview.');
      setPreview(Array.isArray(data.awards) ? data.awards : []);
      setCandidateCount(Number(data.candidateCount) || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load preview.');
    } finally {
      setPreviewLoading(false);
    }
  }, [week, gold, silver, bronze, participation]);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/weekly-certificates?mode=history`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load history.');
      setHistory(Array.isArray(data.weeks) ? data.weeks : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth !== 'true') {
      router.push('/admin/login');
      return;
    }
    loadPreview();
    loadHistory();
  }, [loadPreview, loadHistory, router]);

  const issueAll = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm('Issue weekly certificates for this week? This will award points and badges.')) {
      return;
    }
    setIssueLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/weekly-certificates', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week,
          goldCount: gold,
          silverCount: silver,
          bronzeCount: bronze,
          participationMax: participation,
          dryRun,
          issuedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed.');
      if (dryRun) {
        setMessage(`Dry run: ${Number(data.preview?.length || 0)} certificates would be issued.`);
        setPreview(Array.isArray(data.preview) ? data.preview : []);
      } else {
        setMessage(
          `Issued ${Number(data.insertedCount || 0)} certificates for week ${data.week?.week_start_date || week}. ${Number(data.totalPointsAwarded || 0)} total points awarded.`
        );
        await Promise.all([loadPreview(), loadHistory()]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to issue certificates.');
    } finally {
      setIssueLoading(false);
    }
  };

  const tiersBreakdown = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of preview) map.set(a.tier, (map.get(a.tier) || 0) + 1);
    return [
      { tier: 'gold', label: 'Gold', count: map.get('gold') || 0, emoji: '🥇' },
      { tier: 'silver', label: 'Silver', count: map.get('silver') || 0, emoji: '🥈' },
      { tier: 'bronze', label: 'Bronze', count: map.get('bronze') || 0, emoji: '🥉' },
      { tier: 'participation', label: 'Participation', count: map.get('participation') || 0, emoji: '🏅' },
    ];
  }, [preview]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Weekly certificates</h1>
            <p className="text-sm text-slate-600">
              Rank learners by unique active days first. Ties share a rank and medal; participation certificates keep everyone else encouraged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>← Admin home</Button>
            <Button variant="outline" onClick={() => router.push('/admin/winners')}>Winners / points</Button>
            <Button variant="outline" onClick={loadHistory} disabled={historyLoading}>Refresh history</Button>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <label className="md:col-span-2 text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Week start (YYYY-MM-DD)</span>
              <input
                type="date"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Gold</span>
              <input
                type="number" min={0}
                value={gold}
                onChange={(e) => setGold(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Silver</span>
              <input
                type="number" min={0}
                value={silver}
                onChange={(e) => setSilver(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Bronze</span>
              <input
                type="number" min={0}
                value={bronze}
                onChange={(e) => setBronze(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Participation cap</span>
              <input
                type="number" min={0}
                value={participation}
                onChange={(e) => setParticipation(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="block text-sm md:max-w-xs">
            <span className="mb-1 block font-semibold text-slate-700">Issued by (optional)</span>
            <input
              type="text"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Admin / Madrasah name"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={loadPreview} disabled={previewLoading} variant="outline">
              {previewLoading ? 'Loading…' : 'Preview who gets what'}
            </Button>
            <Button variant="outline" onClick={() => issueAll(true)} disabled={issueLoading}>
              {issueLoading ? 'Working…' : 'Dry run (no save)'}
            </Button>
            <Button onClick={() => issueAll(false)} disabled={issueLoading}>
              {issueLoading ? 'Issuing…' : 'Issue this week'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Candidates</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{candidateCount}</p>
            </div>
            {tiersBreakdown.map((t) => (
              <div key={t.tier} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  <span className="mr-1">{t.emoji}</span>{t.count}
                </p>
              </div>
            ))}
          </div>

          {preview.length === 0 ? (
            <p className="text-sm text-slate-500">No certificates to show. Click “Preview who gets what”.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Tier</th>
                    <th className="px-3 py-2 text-right">Pts</th>
                    <th className="px-3 py-2 text-right">Days</th>
                    <th className="px-3 py-2 text-right">Activities</th>
                    <th className="px-3 py-2 text-right">Reward pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((a) => (
                    <tr key={`${a.userId}-${a.tier}-${a.rank}`} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-slate-700">{a.rank}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{a.name}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          {a.tier === 'gold' ? '🥇' : a.tier === 'silver' ? '🥈' : a.tier === 'bronze' ? '🥉' : '🏅'}
                          {a.tier}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.weeklyPoints}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.weeklyScore}/7</td>
                      <td className="px-3 py-2 text-right tabular-nums">{a.weeklyActivityCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700 font-bold">+{a.points_to_award}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Issuance history</h2>
            <span className="text-xs text-slate-500">
              {historyLoading ? 'Loading…' : `${history.length} week(s) recorded`}
            </span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No issued weeks yet. Use “Issue this week” to create them.</p>
          ) : (
            <div className="space-y-4">
              {history.map((w) => (
                <details key={w.week_start_date} className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 open:bg-white">
                  <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Week {w.week_start_date}</p>
                      <p className="text-xs text-slate-500">{w.count} certificate(s)</p>
                    </div>
                    <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Rank</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Tier</th>
                          <th className="px-3 py-2 text-right">Pts</th>
                          <th className="px-3 py-2 text-right">Days</th>
                          <th className="px-3 py-2 text-right">Activities</th>
                          <th className="px-3 py-2 text-left">Issued</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(w.rows || []).map((r: any) => (
                          <tr key={String(r.id || `${r.user_id}-${r.rank}`)}>
                            <td className="px-3 py-2 text-slate-700">#{r.rank}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{r.user_name}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                {r.tier === 'gold' ? '🥇' : r.tier === 'silver' ? '🥈' : r.tier === 'bronze' ? '🥉' : '🏅'}
                                {r.tier}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.weekly_points || 0}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.weekly_score || 0}/7</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.weekly_activity_count || 0}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {r.issued_at ? new Date(r.issued_at).toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
