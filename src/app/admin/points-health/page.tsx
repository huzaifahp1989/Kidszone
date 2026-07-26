'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import type { PointsHealthReport } from '@/lib/points-health';

export default function AdminPointsHealthPage() {
  const router = useRouter();
  const [report, setReport] = React.useState<PointsHealthReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth');
      if (auth !== 'true') {
        router.push('/admin/login');
        return;
      }
      const res = await fetch('/api/health/points', { cache: 'no-store' });
      const data = (await res.json()) as PointsHealthReport;
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load points health');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Points health</h1>
            <p className="text-sm text-slate-600">
              Read-only Supabase + points diagnostics. Use this when kids say points are not updating.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              ← Admin home
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Checking…' : 'Re-check'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading && !report ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Running checks…</div>
        ) : null}

        {report ? (
          <>
            <div
              className={`rounded-2xl border p-5 ${
                report.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <p className={`text-lg font-black ${report.ok ? 'text-emerald-900' : 'text-red-900'}`}>
                {report.ok ? 'Points system looks healthy' : 'Critical points / Supabase issues found'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Checked at {new Date(report.checkedAt).toLocaleString()}</p>
            </div>

            {report.issues.length ? (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Issues</h2>
                {report.issues.map((issue) => (
                  <div
                    key={issue.code}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      issue.severity === 'critical'
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : issue.severity === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <p className="font-bold">
                      [{issue.severity}] {issue.code}
                    </p>
                    <p className="mt-1">{issue.message}</p>
                    {issue.fixHint ? <p className="mt-2 text-xs font-semibold opacity-90">Fix: {issue.fixHint}</p> : null}
                  </div>
                ))}
              </section>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800">
                No issues reported.
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Checks</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(report.checks).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <dt className="font-semibold text-slate-600">{key}</dt>
                    <dd className="font-mono text-slate-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
