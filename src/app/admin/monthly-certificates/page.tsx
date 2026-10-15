'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const adminHeaders = { 'x-admin-auth': 'true' } as const;

type PreviewAward = {
  userId: string;
  name: string;
  category: 'monthly_points' | 'always_active';
  rank: number;
  tier: string;
  monthlyPoints: number;
  monthlyActivityCount: number;
  activeWeeksInMonth: number;
  consecutiveActiveMonths: number;
  points_to_award: number;
};

type HistoryMonth = {
  month_start_date: string;
  counts: { monthly_points: number; always_active: number };
  rows: any[];
};

function defaultMonth(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
}

function tierMeta(tier: string) {
  switch (tier) {
    case 'gold':
      return { bg: 'bg-amber-50 border-amber-300 text-amber-800', medal: '🥇' };
    case 'silver':
      return { bg: 'bg-slate-50 border-slate-300 text-slate-800', medal: '🥈' };
    case 'bronze':
      return { bg: 'bg-orange-50 border-orange-300 text-orange-800', medal: '🥉' };
    case 'activity':
      return { bg: 'bg-emerald-50 border-emerald-300 text-emerald-800', medal: '🏃' };
    default:
      return { bg: 'bg-sky-50 border-sky-300 text-sky-800', medal: '🏅' };
  }
}

export default function AdminMonthlyCertificatesPage() {
  const router = useRouter();
  const [month, setMonth] = React.useState<string>(defaultMonth);
  const [gold, setGold] = React.useState<number>(3);
  const [silver, setSilver] = React.useState<number>(5);
  const [bronze, setBronze] = React.useState<number>(10);
  const [participation, setParticipation] = React.useState<number>(200);
  const [category, setCategory] = React.useState<'monthly_points' | 'always_active' | 'both'>('both');
  const [issuedBy, setIssuedBy] = React.useState<string>('Admin');
  const [preview, setPreview] = React.useState<PreviewAward[]>([]);
  const [candidateCount, setCandidateCount] = React.useState<number>(0);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [issueLoading, setIssueLoading] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryMonth[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const loadPreview = React.useCallback(async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        month,
        category,
        gold: String(gold),
        silver: String(silver),
        bronze: String(bronze),
        participation: String(participation),
      });
      const res = await fetch(`/api/admin/monthly-certificates?${qs.toString()}`, {
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
  }, [month, category, gold, silver, bronze, participation]);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/monthly-certificates?mode=history`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load history.');
      setHistory(Array.isArray(data.months) ? data.months : []);
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
    if (!dryRun && !window.confirm('Issue monthly certificates for this month? This awards points and badges.')) return;
    setIssueLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/monthly-certificates', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          goldCount: gold,
          silverCount: silver,
          bronzeCount: bronze,
          participationMax: participation,
          category,
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
          `Issued ${Number(data.insertedCount || 0)} certificates for month ${data.month?.month_start_date || month}. ${Number(data.totalPointsAwarded || 0)} total points awarded.`
        );
        await Promise.all([loadPreview(), loadHistory()]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to issue certificates.');
    } finally {
      setIssueLoading(false);
    }
  };

  const monthlyAwards = preview.filter((p) => p.category === 'monthly_points');
  const activityAwards = preview.filter((p) => p.category === 'always_active');

  const tiersBreakdown = (list: PreviewAward[]) => {
    const map = new Map<string, number>();
    for (const a of list) map.set(a.tier, (map.get(a.tier) || 0) + 1);
    return [
      { tier: 'gold', label: 'Gold', count: map.get('gold') || 0, emoji: '🥇' },
      { tier: 'silver', label: 'Silver', count: map.get('silver') || 0, emoji: '🥈' },
      { tier: 'bronze', label: 'Bronze', count: map.get('bronze') || 0, emoji: '🥉' },
      { tier: 'participation', label: 'Participation', count: map.get('participation') || 0, emoji: '🏅' },
      { tier: 'activity', label: 'Activity', count: map.get('activity') || 0, emoji: '🏃' },
    ].filter((r) => r.count > 0 || ['gold', 'silver', 'bronze', 'participation', 'activity'].includes(r.tier));
  };

  const categoryLabel = (c: 'monthly_points' | 'always_active') =>
    c === 'monthly_points' ? 'Monthly Points Leaderboard' : 'Always Active Kids Zone';

  const renderAwardTable = (rows: PreviewAward[]) => {
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No awards in this category yet. Adjust thresholds and reload.
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Learner</th>
              <th className="px-3 py-2 font-semibold">Tier</th>
              <th className="px-3 py-2 font-semibold">Monthly pts</th>
              <th className="px-3 py-2 font-semibold">Activity</th>
              <th className="px-3 py-2 font-semibold">Active weeks</th>
              <th className="px-3 py-2 font-semibold">Streak months</th>
              <th className="px-3 py-2 font-semibold">+pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const t = tierMeta(r.tier);
              return (
                <tr key={`${r.category}-${r.userId}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-slate-600">{r.rank}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${t.bg}`}>
                      <span>{t.medal}</span>
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.monthlyPoints.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{r.monthlyActivityCount.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{r.activeWeeksInMonth} / 4</td>
                  <td className="px-3 py-2 tabular-nums">{r.consecutiveActiveMonths}</td>
                  <td className="px-3 py-2 font-bold text-emerald-700 tabular-nums">+{r.points_to_award}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            🎖️ Monthly Certificates
          </h1>
          <p className="text-sm text-slate-600">
            Award monthly certificates to kids with the most monthly points, and to kids who were
            <span className="mx-1 font-semibold text-indigo-700">Always Active</span> in Kids Zone.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700 lg:col-span-1">
              Month start (YYYY-MM-DD)
              <input
                type="date"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Gold
              <input type="number" min={0} value={gold} onChange={(e) => setGold(Number(e.target.value) || 0)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Silver
              <input type="number" min={0} value={silver} onChange={(e) => setSilver(Number(e.target.value) || 0)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Bronze
              <input type="number" min={0} value={bronze} onChange={(e) => setBronze(Number(e.target.value) || 0)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Participation (max)
              <input type="number" min={0} value={participation} onChange={(e) => setParticipation(Number(e.target.value) || 0)} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700 lg:col-span-1">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner"
              >
                <option value="both">Both</option>
                <option value="monthly_points">Monthly Points</option>
                <option value="always_active">Always Active</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700 lg:col-span-1">
              Issued by
              <input
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-inner"
                placeholder="Admin"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadPreview()}
              disabled={previewLoading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {previewLoading ? 'Loading…' : '🔎 Preview'}
            </button>
            <button
              onClick={() => void issueAll(true)}
              disabled={issueLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {issueLoading ? 'Running…' : '🧪 Dry run (no save)'}
            </button>
            <button
              onClick={() => void issueAll(false)}
              disabled={issueLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
            >
              ✅ Issue this month
            </button>
            <div className="ml-auto text-xs text-slate-500">
              Candidate learners: <span className="font-bold text-slate-800">{candidateCount}</span>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
              {error}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">🥇 Monthly Points Awards</h2>
                <p className="text-xs text-slate-600">Top point earners this month.</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {tiersBreakdown(monthlyAwards).slice(0, 4).map((r) => (
                  <span
                    key={r.tier}
                    className={`rounded-full border px-2 py-0.5 text-xs font-bold ${tierMeta(r.tier).bg}`}
                  >
                    {r.emoji} {r.label} {r.count}
                  </span>
                ))}
              </div>
            </div>
            {renderAwardTable(monthlyAwards)}
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">🏃 Always Active Awards</h2>
                <p className="text-xs text-slate-600">
                  Active ≥ 3/4 weeks + good points/activity across the month.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {tiersBreakdown(activityAwards).map((r) => (
                  <span
                    key={r.tier}
                    className={`rounded-full border px-2 py-0.5 text-xs font-bold ${tierMeta(r.tier).bg}`}
                  >
                    {r.emoji} {r.label} {r.count}
                  </span>
                ))}
              </div>
            </div>
            {renderAwardTable(activityAwards)}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">📚 Issuance history</h2>
            <button
              onClick={() => void loadHistory()}
              disabled={historyLoading}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-600 disabled:opacity-60"
            >
              {historyLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No monthly certificates issued yet. Use the green “Issue this month” button above.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((m) => {
                const open = expanded[m.month_start_date];
                return (
                  <div key={m.month_start_date} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [m.month_start_date]: !open }))}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/60"
                    >
                      <div>
                        <div className="text-lg font-extrabold text-slate-900">{m.month_start_date}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                            🥇 Monthly points: {m.counts.monthly_points}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                            🏃 Always active: {m.counts.always_active}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400">{open ? '▾' : '▸'}</span>
                    </button>
                    {open && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="overflow-hidden rounded-xl border border-slate-200 text-sm">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Category</th>
                                <th className="px-3 py-2 font-semibold">#</th>
                                <th className="px-3 py-2 font-semibold">Learner</th>
                                <th className="px-3 py-2 font-semibold">Tier</th>
                                <th className="px-3 py-2 font-semibold">Pts</th>
                                <th className="px-3 py-2 font-semibold">Active wks</th>
                                <th className="px-3 py-2 font-semibold">+pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.rows.map((r, idx) => {
                                const t = tierMeta(String(r.tier || 'participation'));
                                return (
                                  <tr key={`${r.id || idx}`} className="border-t border-slate-100">
                                    <td className="px-3 py-2 text-xs font-bold text-slate-600">
                                      {categoryLabel(r.category as any)}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{r.rank}</td>
                                    <td className="px-3 py-2 font-semibold text-slate-800">{r.user_name}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${t.bg}`}>
                                        {t.medal} {r.tier}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{Number(r.monthly_points || 0).toLocaleString()}</td>
                                    <td className="px-3 py-2 tabular-nums">{r.active_weeks_in_month} / 4</td>
                                    <td className="px-3 py-2 font-bold text-emerald-700 tabular-nums">
                                      +{Number(r.points_awarded || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
