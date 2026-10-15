'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Check, Headphones, Pencil, Star } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type SurahMeta = {
  number: number;
  arabicName: string;
  englishName: string;
  ayahCount: number | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  theme: string;
  mainLesson: string;
  listenUrl: string;
  learnUrl: string;
  apiUrl: string;
};

type Payload = {
  week: {
    weekStart: string;
    weekEnd: string;
    focus: string;
    badge: string;
    hint: string;
    surah: SurahMeta;
  };
  progress: {
    completed: boolean;
    percent: number;
    readMinutes: number;
    listened: boolean;
    readFull: boolean;
    practiced: boolean;
    pointsEarned: number;
  };
};

export function SurahOfTheWeekCard() {
  const { user, refreshProfile } = useAuth();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/surah-of-the-week?userId=${user.id}`, {
        cache: 'no-store',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load Surah of the Week.');
      setPayload(data as Payload);
    } catch (e: any) {
      setError(e?.message || 'Could not load the surah right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setPayload(null);
      setLoading(false);
      return;
    }
    load();
  }, [user?.id, load]);

  const updateProgress = async (flags: {
    listened?: boolean;
    read_full?: boolean;
    practiced?: boolean;
    read_minutes?: number;
  }) => {
    if (!user?.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authJsonFetch('/api/surah-of-the-week', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, flags }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not save progress.');
      if (data?.points_awarded) await refreshProfile();
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: {
            ...prev.progress,
            completed: Boolean(data?.progress?.completed) || prev.progress.completed,
            percent: Number(data?.progress?.percent) ?? prev.progress.percent,
            readMinutes: Number(data?.progress?.readMinutes) ?? prev.progress.readMinutes,
            listened: Boolean(data?.progress?.listened) || prev.progress.listened,
            readFull: Boolean(data?.progress?.readFull) || prev.progress.readFull,
            practiced: Boolean(data?.progress?.practiced) || prev.progress.practiced,
            pointsEarned: Math.max(
              prev.progress.pointsEarned,
              prev.progress.pointsEarned + (Number(data?.points_awarded) || 0)
            ),
          },
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Could not save progress.');
    } finally {
      setBusy(false);
    }
  };

  const [minutesInput, setMinutesInput] = useState<number>(0);

  if (!user) return null;

  if (loading) {
    return (
      <section className="rounded-3xl border border-sky-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-56 rounded bg-sky-100" />
          <div className="h-28 rounded-2xl bg-sky-50" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded-2xl bg-sky-50" />
            <div className="h-20 rounded-2xl bg-sky-50" />
            <div className="h-20 rounded-2xl bg-sky-50" />
          </div>
        </div>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-center">
        <p className="text-sky-700">Could not load Surah of the Week right now.</p>
        <button onClick={load} className="mt-3 text-sm font-bold text-sky-800 underline">
          Try again
        </button>
      </section>
    );
  }

  const { week, progress } = payload;

  return (
    <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6 shadow-lg">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800">
            <Star size={14} />
            Surah of the Week
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
              {week.weekStart} — {week.weekEnd}
            </span>
          </div>
          <h3 className="mt-3 text-3xl font-black text-sky-900">
            {week.surah.arabicName} · {week.surah.englishName}
          </h3>
          <p className="mt-2 text-sm text-slate-600">{week.focus}</p>
          {week.surah.mainLesson ? (
            <p className="mt-2 rounded-xl bg-white border border-sky-100 p-3 text-sm text-slate-700">
              💡 <b>Main lesson:</b> {week.surah.mainLesson}
            </p>
          ) : null}
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-100 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-800">
            <Award size={16} />
            Badge this week: {week.badge}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 md:items-end">
          <div className="rounded-2xl border border-sky-100 bg-white px-5 py-4 text-center shadow min-w-[180px]">
            <p className="text-xs uppercase tracking-wider text-sky-700 font-bold">Progress</p>
            <p className="text-3xl font-black text-sky-900 mt-1">{progress.percent}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {progress.readMinutes} min read · {progress.pointsEarned} pts earned
            </p>
          </div>
          <Link
            href={week.surah.learnUrl}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-sky-700"
          >
            <BookOpen size={16} />
            Open surah page
          </Link>
        </div>
      </header>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-sky-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress.completed
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500'
              : 'bg-gradient-to-r from-sky-400 to-indigo-500'
          }`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <ProgressPill
          title="Listen once"
          icon={<Headphones size={16} />}
          description="Full audio recitation"
          done={progress.listened}
          onDone={() => updateProgress({ listened: true })}
          cta="I listened"
          busy={busy}
        />
        <ProgressPill
          title="Read the full surah"
          icon={<BookOpen size={16} />}
          description={`${week.surah.ayahCount ?? ''} ayahs`}
          done={progress.readFull}
          onDone={() => updateProgress({ read_full: true })}
          cta="Mark read"
          busy={busy}
        />
        <ProgressPill
          title="Practiced (read or say it)"
          icon={<Pencil size={16} />}
          description={week.hint}
          done={progress.practiced}
          onDone={() => updateProgress({ practiced: true })}
          cta="I practiced"
          busy={busy}
        />

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-black text-sky-900">Add reading minutes</p>
          <p className="text-xs text-slate-500 mt-1">+2 pts every 3 min</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={minutesInput || ''}
              onChange={(e) => setMinutesInput(Math.max(0, Number(e.target.value || 0)))}
              className="w-20 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-right font-black"
              placeholder="5"
            />
            <button
              disabled={busy || !(minutesInput > 0)}
              onClick={() => {
                if (!(minutesInput > 0)) return;
                updateProgress({ read_minutes: minutesInput });
                setMinutesInput(0);
              }}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-sky-700 disabled:opacity-60"
            >
              +Log min
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressPill(props: {
  title: string;
  icon: React.ReactNode;
  description: string;
  done: boolean;
  onDone: () => void;
  cta: string;
  busy: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        props.done ? 'border-emerald-300 bg-emerald-50' : 'border-sky-100 bg-white hover:border-sky-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-sky-900">
            <span className="text-sky-600">{props.icon}</span>
            {props.title}
          </p>
          <p className="mt-2 text-xs text-slate-600">{props.description}</p>
        </div>
        <button
          disabled={props.busy || props.done}
          onClick={props.onDone}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black shadow transition-colors disabled:opacity-60 ${
            props.done ? 'bg-emerald-600 text-white' : 'bg-sky-500 text-white hover:bg-sky-600'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            {props.done ? <Check size={14} /> : null}
            {props.done ? 'Done' : props.cta}
          </span>
        </button>
      </div>
    </div>
  );
}
