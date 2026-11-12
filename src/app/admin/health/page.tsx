'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

type CheckStatus = 'ok' | 'warn' | 'fail';

type HealthCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
};

type HealthGroup = {
  id: string;
  title: string;
  description: string;
  checks: HealthCheck[];
};

type HealthSummary = {
  ok: number;
  warn: number;
  fail: number;
  checkedAt: string;
  authUserTotal: number;
};

const STATUS_STYLES: Record<CheckStatus, { card: string; icon: string; label: string }> = {
  ok: { card: 'border-emerald-200 bg-emerald-50/60', icon: 'text-emerald-600', label: 'Working' },
  warn: { card: 'border-amber-200 bg-amber-50/60', icon: 'text-amber-600', label: 'Warning' },
  fail: { card: 'border-red-200 bg-red-50/60', icon: 'text-red-600', label: 'Failed' },
};

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />;
  if (status === 'warn') return <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />;
  return <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />;
}

export default function AdminHealthPage() {
  const [groups, setGroups] = useState<HealthGroup[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/health', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      if (response.status === 401) {
        throw new Error('Admin session required. Sign in at /admin/login and try again.');
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Health check failed.');
      setGroups(Array.isArray(payload.groups) ? payload.groups : []);
      setSummary(payload.summary ?? null);
    } catch (checkError) {
      setGroups([]);
      setSummary(null);
      setError(checkError instanceof Error ? checkError.message : 'Health check failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const checkedAt = summary?.checkedAt ? new Date(summary.checkedAt).toLocaleString('en-GB') : '';

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Admin dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Supabase health check</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Verifies the database connection, credentials, sign-in/sign-up, points and audio storage. Read-only —
            nothing here changes your data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runChecks()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {loading ? 'Checking…' : 'Re-run checks'}
        </button>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-2xl font-black text-emerald-700">{summary.ok}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Working</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-2xl font-black text-amber-700">{summary.warn}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Warnings</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-2xl font-black text-red-700">{summary.fail}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-red-800">Failed</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-black text-slate-800">{summary.authUserTotal}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Registered accounts</p>
          </div>
        </div>
      )}

      {checkedAt && <p className="mb-4 text-xs text-slate-500">Last checked: {checkedAt}</p>}

      {loading && groups.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Running checks against Supabase…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-bold">Could not run the health check</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-900">{group.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{group.description}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {group.checks.map((check) => {
                const style = STATUS_STYLES[check.status];
                return (
                  <li key={check.id} className="flex gap-3 p-4 sm:p-5">
                    <StatusIcon status={check.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800">{check.label}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${style.card} ${style.icon}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm text-slate-600">{check.detail}</p>
                      {check.hint && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <span className="font-bold">Fix: </span>
                          {check.hint}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
