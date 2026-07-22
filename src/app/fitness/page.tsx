'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  getFitnessStatus,
  startFitnessUpdates,
  type FitnessMeasurement,
  type FitnessStatus,
} from '@/lib/fitness-tracker';

function formatNumber(value: number | null | undefined) {
  const safeValue = Number(value || 0);
  return new Intl.NumberFormat().format(safeValue);
}

function formatDistance(meters: number | null) {
  if (meters == null) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatTime(value: number | null | undefined) {
  if (!value) return 'Not updated yet';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function FitnessPage() {
  const router = useRouter();
  const { profile } = useAuth() as { profile?: { name?: string } | null };
  const [status, setStatus] = useState<FitnessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const loadStatus = useCallback(async (requestPermission = false) => {
    if (requestPermission) {
      setRequestingPermission(true);
    } else {
      setRefreshing(true);
    }

    try {
      const nextStatus = await getFitnessStatus({ requestPermission });
      setStatus(nextStatus);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setRequestingPermission(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus(false);
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.native || !status.available || status.permission !== 'granted') return;

    let disposed = false;
    let stopUpdates: (() => Promise<void>) | null = null;

    void startFitnessUpdates((measurement: FitnessMeasurement) => {
      if (disposed) return;
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              measurement,
              message:
                prev.platform === 'ios'
                  ? 'Showing steps measured today from your iPhone motion sensor.'
                  : 'Showing live steps from your Android phone while the app is open.',
            }
          : prev
      );
    }).then((cleanup) => {
      if (disposed) {
        void cleanup();
        return;
      }
      stopUpdates = cleanup;
    }).catch(() => {
      if (disposed) return;
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              message: 'Live updates could not start, but you can still refresh the current step count.',
            }
          : prev
      );
    });

    return () => {
      disposed = true;
      if (stopUpdates) {
        void stopUpdates();
      }
    };
  }, [status?.available, status?.native, status?.permission, status?.platform]);

  const userLabel = useMemo(() => {
    const name = profile?.name?.trim();
    return name ? `${name}'s Fitness Tracker` : 'Fitness Tracker';
  }, [profile?.name]);

  const measurement = status?.measurement;
  const isPermissionBlocked = status?.permission === 'denied';
  const isPermissionPending =
    status?.permission === 'prompt' || status?.permission === 'prompt-with-rationale';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-6 py-8 text-white">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
                  <Activity size={14} /> New Fitness Page
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">{userLabel}</h1>
                <p className="mt-3 max-w-xl text-sm text-emerald-50/90 md:text-base">
                  Count steps with your phone&apos;s motion sensor, request permission when needed,
                  and keep a simple live total in the Kids Zone app.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-50/80">
                  Step Count
                </p>
                <p className="mt-2 text-5xl font-black leading-none">{formatNumber(measurement?.steps)}</p>
                <p className="mt-2 text-sm text-emerald-50/85">
                  {status?.platform === 'ios'
                    ? 'Today on iPhone'
                    : status?.platform === 'android'
                      ? 'Live on Android'
                      : 'Open in mobile app'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadStatus(false)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                Refresh Steps
              </button>

              {(isPermissionPending || isPermissionBlocked) && (
                <button
                  type="button"
                  onClick={() => void loadStatus(true)}
                  disabled={requestingPermission}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={18} />
                  {requestingPermission ? 'Requesting Access...' : 'Allow Motion Access'}
                </button>
              )}

              <Link
                href="/tracker"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Go to Daily Tracker
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <span className="font-bold text-slate-800">Status:</span> {loading ? 'Loading step tracker...' : status?.message}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Platform"
                value={status?.native ? status.platform.toUpperCase() : 'WEB'}
                hint={status?.native ? 'Reads the phone motion sensor directly.' : 'Open the mobile app to use step tracking.'}
              />
              <StatCard
                label="Permission"
                value={status?.permission === 'granted' ? 'Granted' : status?.permission === 'unsupported' ? 'Unavailable' : 'Needed'}
                hint="Motion access is required before steps can be read."
              />
              <StatCard
                label="Last Update"
                value={formatTime(measurement?.updatedAt)}
                hint="Live updates work while this page stays open."
              />
              <StatCard
                label="Distance"
                value={formatDistance(measurement?.distanceMeters ?? null) ?? 'Not available'}
                hint={status?.platform === 'ios' ? 'Estimated from iPhone pedometer data.' : 'Distance is not provided on Android.'}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5">
                <h2 className="text-lg font-black text-emerald-900">What this version does</h2>
                <div className="mt-3 space-y-2 text-sm text-emerald-900/85">
                  <p>Reads step data from the phone sensor inside the native app.</p>
                  <p>Requests motion permission when the device asks for it.</p>
                  <p>Keeps the latest reading cached on this device for today.</p>
                  <p>Shows extra distance and floor data on supported iPhones.</p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50 p-5">
                <h2 className="text-lg font-black text-sky-900">Important notes</h2>
                <div className="mt-3 space-y-2 text-sm text-sky-900/85">
                  <p>Android updates are most reliable while the app is open on screen.</p>
                  <p>Web browsers do not expose the native step sensor used here.</p>
                  <p>If permission was denied earlier, reopen the device settings and allow motion access.</p>
                  <p>This first version keeps data on the device and does not sync to your profile yet.</p>
                </div>
              </div>
            </div>

            {status?.platform === 'ios' && (
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Cadence"
                  value={measurement?.cadence != null ? `${measurement.cadence.toFixed(2)} steps/s` : 'Not available'}
                  hint="Only shown on supported iPhones."
                />
                <StatCard
                  label="Floors Up"
                  value={measurement?.floorsAscended != null ? formatNumber(measurement.floorsAscended) : 'Not available'}
                  hint="Estimated by the phone pedometer."
                />
                <StatCard
                  label="Floors Down"
                  value={measurement?.floorsDescended != null ? formatNumber(measurement.floorsDescended) : 'Not available'}
                  hint="Estimated by the phone pedometer."
                />
              </div>
            )}

            {!status?.native && (
              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <Smartphone size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Open this page in the mobile app</p>
                    <p className="mt-1">
                      Step counting uses native Android and iPhone motion sensors, so it will not work
                      inside a regular browser tab.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
