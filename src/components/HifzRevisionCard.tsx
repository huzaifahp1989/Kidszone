'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePointsProgress } from '@/lib/points-progress-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import { getHifzSurah } from '@/data/hifz-surahs';

type RevisionRow = {
  surah_number: number;
  status: string;
  interval_days: number;
  streak: number;
  last_reviewed_at: string | null;
  due_at: string;
  review_count: number;
};

type Summary = {
  dueCount: number;
  scheduledCount: number;
  completedToday: number;
  nextDueAt: string | null;
};

type RevisionData = {
  available: boolean;
  schedule?: RevisionRow[];
  due?: RevisionRow[];
  summary?: Summary;
  inserted?: number;
  pointsAwarded?: number;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
};

function surahLabel(number: number): string {
  const surah = getHifzSurah(number);
  return surah ? `${number}. ${surah.englishName}` : `Surah ${number}`;
}

export function HifzRevisionCard() {
  const { user, updateLocalProfile, refreshProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();

  const [data, setData] = useState<RevisionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch('/api/hifz/revision', { cache: 'no-store', headers });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setData(json as RevisionData);
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const record = async (surahNumber: number, remembered: boolean) => {
    if (busy) return;
    setBusy(`${surahNumber}:${remembered ? 'yes' : 'no'}`);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/hifz/revision', {
        method: 'POST',
        body: JSON.stringify({ surahNumber, remembered }),
      });
      const json: RevisionData & { error?: string } = await res.json().catch(() => ({}));
      if (res.ok && json.available) {
        setData(json);
        setMessage(
          remembered
            ? 'MashaAllah! Revision logged — see you in a few days.'
            : "That's okay — we'll practice this one again tomorrow."
        );

        if (json.profile) {
          updateLocalProfile({
            points: json.profile.points,
            weeklyPoints: json.profile.weeklyPoints,
            monthlyPoints: json.profile.monthlyPoints,
            todayPoints: json.profile.todayPoints,
          });
        }

        const awarded = Number(json.pointsAwarded ?? 0);
        if (awarded > 0) {
          showPointsProgress({
            activity: 'mission',
            activityLabel: 'Hifz Revision',
            pointsEarned: awarded,
            message: `Revised ${surahLabel(surahNumber)}`,
          });
          await refreshProfile();
        }
      } else {
        setMessage('Could not save that right now.');
      }
    } catch {
      setMessage('Could not save that right now.');
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    if (busy) return;
    setBusy('sync');
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/hifz/revision', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      });
      const json: RevisionData & { error?: string } = await res.json().catch(() => ({}));
      if (res.ok && json.available) {
        setData(json);
        const inserted = Number(json.inserted ?? 0);
        setMessage(
          inserted > 0
            ? `Added ${inserted} memorised surah${inserted === 1 ? '' : 's'} to your revision plan.`
            : 'Your revision plan is already up to date.'
        );
      } else {
        setMessage('Could not sync right now.');
      }
    } catch {
      setMessage('Could not sync right now.');
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  if (loading && !data) {
    return (
      <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Checking today&apos;s revision…</p>
      </section>
    );
  }

  if (!data || data.available === false) return null;

  const due = data.due ?? [];
  const summary: Summary = data.summary ?? {
    dueCount: 0,
    scheduledCount: 0,
    completedToday: 0,
    nextDueAt: null,
  };
  const top = due[0];

  return (
    <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-white/80 px-3 py-1 text-xs font-bold text-teal-700">
            <BookOpen size={14} />
            Today&apos;s revision
          </div>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
            {due.length > 0 ? (
              <>
                {due.length} surah{due.length === 1 ? '' : 's'} ready to revise 🔁
              </>
            ) : (
              <>You&apos;re all caught up! 🌟</>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {due.length > 0
              ? 'A quick revision now keeps your memorisation strong.'
              : 'Nothing is due right now — come back tomorrow, or sync your memorised surahs.'}
          </p>
        </div>

        <div className="flex gap-2 text-center">
          <div className="rounded-2xl border border-teal-300/40 bg-white/80 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Due</p>
            <p className="text-2xl font-black text-teal-900">{summary.dueCount}</p>
          </div>
          <div className="rounded-2xl border border-violet-300/40 bg-white/80 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Done today</p>
            <p className="text-2xl font-black text-violet-900">{summary.completedToday}</p>
          </div>
        </div>
      </div>

      {top ? (
        <div className="mt-4 rounded-2xl border border-teal-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Start here</p>
          <p className="mt-1 font-bold text-slate-900">{surahLabel(top.surah_number)}</p>
          <p className="text-xs text-slate-500">
            Reviewed {top.review_count} time{top.review_count === 1 ? '' : 's'}
            {top.streak > 0 ? ` · ${top.streak} in a row` : ''}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void record(top.surah_number, true)}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {busy === `${top.surah_number}:yes` ? 'Saving…' : 'I remembered it'}
            </button>
            <button
              type="button"
              onClick={() => void record(top.surah_number, false)}
              disabled={busy !== null}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {busy === `${top.surah_number}:no` ? 'Saving…' : 'Needs practice'}
            </button>
          </div>

          {due.length > 1 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Also due</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {due.slice(1).map((item) => (
                  <li
                    key={item.surah_number}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800"
                  >
                    {surahLabel(item.surah_number)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-white/80 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal-900">
            <Sparkles size={16} className="text-teal-600" />
            No revision due. Keep it up!
          </p>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={busy !== null}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={busy === 'sync' ? 'animate-spin' : ''} />
            {busy === 'sync' ? 'Syncing…' : 'Sync my memorised surahs'}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-teal-900">{message}</p>}
    </section>
  );
}
