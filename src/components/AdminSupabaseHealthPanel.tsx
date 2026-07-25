'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import type { SupabaseHealthReport } from '@/lib/supabase-health-report';

type Variant = 'banner' | 'full';

const adminHeaders = { 'x-admin-auth': 'true' };

function statusStyles(status: 'working' | 'degraded' | 'broken') {
  if (status === 'working') {
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      label: 'Working',
    };
  }
  if (status === 'degraded') {
    return {
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      label: 'Degraded',
    };
  }
  return {
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Broken',
  };
}

function severityStyles(severity: 'critical' | 'warning' | 'info') {
  if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-900';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

export function AdminSupabaseHealthPanel({ variant = 'full' }: { variant?: Variant }) {
  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/supabase-health', {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Supabase health');
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Supabase health');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) {
    return (
      <div
        className={
          variant === 'banner'
            ? 'mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600'
            : 'rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600'
        }
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Supabase (sign up &amp; points)…
      </div>
    );
  }

  if (error && !report) {
    return (
      <div
        className={
          variant === 'banner'
            ? 'mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
            : 'rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800'
        }
      >
        <p className="font-semibold">Could not load Supabase status</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!report) return null;

  const signupStyle = statusStyles(report.platform.signup);
  const pointsStyle = statusStyles(report.platform.points);
  const SignupIcon = signupStyle.icon;
  const PointsIcon = pointsStyle.icon;
  const problemIssues = report.issues.filter((i) => i.code !== 'all_clear');

  if (variant === 'banner') {
    const allGood = report.ok;
    return (
      <div
        className={`mb-6 rounded-xl border px-4 py-3 ${
          allGood ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-800">Supabase status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${signupStyle.badge}`}
            >
              <SignupIcon className="h-3.5 w-3.5" />
              Sign up: {signupStyle.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${pointsStyle.badge}`}
            >
              <PointsIcon className="h-3.5 w-3.5" />
              Points: {pointsStyle.label}
            </span>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {!allGood && problemIssues.length > 0 && (
          <p className="mt-2 text-sm text-amber-900">
            {problemIssues[0].message}{' '}
            <span className="font-medium">Open System tab for fix steps.</span>
          </p>
        )}
        {allGood && (
          <p className="mt-2 text-sm text-emerald-800">
            Sign up and points are working. New users can join and quiz scores save correctly.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Supabase health</h3>
          <p className="text-sm text-slate-600 mt-1">
            Live checks for sign up, auth, and points saving. Use this when users report stuck quizzes or missing scores.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Re-check'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-4 ${signupStyle.badge}`}>
          <div className="flex items-center gap-2 font-bold">
            <SignupIcon className="h-5 w-5" />
            Sign up — {signupStyle.label}
          </div>
          <p className="mt-2 text-sm opacity-90">{report.platform.signupMessage}</p>
        </div>
        <div className={`rounded-xl border p-4 ${pointsStyle.badge}`}>
          <div className="flex items-center gap-2 font-bold">
            <PointsIcon className="h-5 w-5" />
            Points — {pointsStyle.label}
          </div>
          <p className="mt-2 text-sm opacity-90">{report.platform.pointsMessage}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">Environment &amp; probes</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Supabase host</dt>
            <dd className="font-mono text-xs text-slate-800">{report.checks.effectiveUrlHost || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Service role (env)</dt>
            <dd className="font-semibold">{report.checks.serviceRoleFromEnv ? 'Set' : 'Missing'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Service role (effective)</dt>
            <dd className="font-semibold">{report.checks.effectiveServiceRole ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Using code fallback</dt>
            <dd className="font-semibold">
              {report.checks.serviceRoleUsingFallback || report.checks.urlUsingFallback ? 'Yes' : 'No'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Auth health</dt>
            <dd className="font-semibold">{report.checks.authHealthOk ? 'OK' : 'Failed'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">users table</dt>
            <dd className="font-semibold">{report.checks.usersTableOk ? 'OK' : 'Failed'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">users_points read</dt>
            <dd className="font-semibold">{report.checks.usersPointsReadOk ? 'OK' : 'Failed'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Quiz write probe</dt>
            <dd className="font-semibold">{report.checks.quizWriteOk ? 'OK' : 'Failed'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Points write probe</dt>
            <dd className="font-semibold">{report.checks.pointsWriteOk ? 'OK' : 'Failed'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Sign ups (7 days)</dt>
            <dd className="font-semibold">
              {report.checks.recentSignups7d === null ? '—' : report.checks.recentSignups7d}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Last checked: {new Date(report.checkedAt).toLocaleString('en-GB')}
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800">
          {report.ok ? 'Status' : 'Issues to fix'}
        </h4>
        {report.issues.map((issue) => (
          <div
            key={issue.code}
            className={`rounded-xl border px-4 py-3 text-sm ${severityStyles(issue.severity)}`}
          >
            <p className="font-semibold">{issue.message}</p>
            <p className="mt-1 opacity-90">
              <span className="font-medium">Fix:</span> {issue.fixHint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
