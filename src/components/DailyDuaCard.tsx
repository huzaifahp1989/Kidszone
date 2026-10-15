'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles, Volume2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import { DAILY_DHIKR_COUNTERS, DailyDua, DailyDhikrCounter, getDefaultDuaSlot } from '@/data/daily-duas';

type DuaItem = DailyDua & { completed: boolean };
type Slot = 'morning' | 'evening';

type DhikrItem = DailyDhikrCounter & {
  count: number;
  milestoneReached: boolean;
};

type Payload = {
  date: string;
  featuredBySlot: Record<Slot, { slot: Slot; dua: DailyDua }>;
  slots: Array<{
    slot: Slot;
    featuredDuaKey: string;
    duas: DuaItem[];
  }>;
  dhikr: DhikrItem[];
};

export function DailyDuaCard() {
  const { user, refreshProfile } = useAuth();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<Slot>(getDefaultDuaSlot());
  const [expandAll, setExpandAll] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/daily-duas?userId=${user.id}&slot=any`, {
        cache: 'no-store',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load daily duas.');
      setPayload(data as Payload);
    } catch (e: any) {
      setError(e?.message || 'Could not load duas right now.');
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

  const markDuaDone = async (dua: DuaItem, s: Slot) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const res = await authJsonFetch('/api/daily-duas', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          action: 'complete_dua',
          duaKey: dua.key,
          slot: s,
          points: dua.points,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not mark dua done.');
      await refreshProfile();
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: prev.slots.map((sl) =>
            sl.slot === s
              ? { ...sl, duas: sl.duas.map((d) => (d.key === dua.key ? { ...d, completed: true } : d)) }
              : sl
          ),
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const tickDhikr = async (c: DhikrItem, by: number) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const res = await authJsonFetch('/api/daily-duas', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          action: 'increment_dhikr',
          dhikrKey: c.key,
          by,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not update dhikr.');
      if (data?.points_awarded) await refreshProfile();
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dhikr: prev.dhikr.map((d) =>
            d.key === c.key
              ? {
                  ...d,
                  count: Number(data?.count ?? Math.min(d.count + by, d.goal * 10)),
                  milestoneReached: Boolean(data?.milestoneReached) || d.milestoneReached,
                }
              : d
          ),
        };
      });
    } catch (e: any) {
      setError(e?.message || 'Could not update dhikr.');
    } finally {
      setBusy(false);
    }
  };

  const currentSlotData = useMemo(() => payload?.slots.find((s) => s.slot === slot), [payload, slot]);
  const featured = useMemo(
    () => currentSlotData?.duas.find((d) => d.key === currentSlotData?.featuredDuaKey) || currentSlotData?.duas[0] || null,
    [currentSlotData]
  );
  const doneInSlot = useMemo(
    () => currentSlotData?.duas.filter((d) => d.completed).length || 0,
    [currentSlotData]
  );
  const totalInSlot = currentSlotData?.duas.length || 0;

  if (!user) return null;

  if (loading) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-56 rounded bg-emerald-100" />
          <div className="h-24 rounded-2xl bg-emerald-50" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-2xl bg-emerald-50" />
            <div className="h-20 rounded-2xl bg-emerald-50" />
          </div>
        </div>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-emerald-700">Could not load your daily duas right now.</p>
        <button onClick={load} className="mt-3 text-sm font-bold text-emerald-800 underline">
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <Sparkles size={14} />
            Daily Duas & Dhikr
          </div>
          <h3 className="mt-3 text-2xl font-bold text-emerald-900">
            Small duas = big blessings
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Say your morning or evening duas, tap dhikr counters, and earn points as you go.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-2xl border border-emerald-200 bg-white p-1">
          {(['morning', 'evening'] as Slot[]).map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                slot === s ? 'bg-emerald-500 text-white shadow' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {s === 'morning' ? '🌅 Morning' : '🌙 Evening'}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {featured && currentSlotData ? (
        <article className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {slot === 'morning' ? '🌅 Featured morning dua' : '🌙 Featured evening dua'}
                <span className="ml-1 rounded-full bg-white/70 px-2 py-0.5 text-emerald-700">
                  +{featured.points} pts
                </span>
              </div>
              <h4 className="mt-3 text-xl font-bold text-emerald-900">{featured.title}</h4>
              <p className="mt-3 text-right font-arabic text-3xl leading-[3rem] text-slate-900">
                {featured.arabic}
              </p>
              <p className="mt-2 text-sm italic text-slate-600">{featured.transliteration}</p>
              <p className="mt-3 text-slate-700">{featured.translation}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-700">{featured.reference}</p>
            </div>

            <div className="flex flex-col items-center gap-3 md:items-end">
              <button
                onClick={() => {
                  try {
                    const u = new SpeechSynthesisUtterance(
                      `${featured.translation}. ${featured.transliteration}.`
                    );
                    u.lang = 'en-US';
                    window.speechSynthesis?.speak(u);
                  } catch {
                    /* ignore */
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
              >
                <Volume2 size={16} />
                Listen
              </button>
              <button
                onClick={() => markDuaDone(featured, slot)}
                disabled={busy || featured.completed}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-black shadow-md transition-all ${
                  featured.completed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60'
                }`}
              >
                <Check size={18} />
                {featured.completed ? 'Alhamdulillah, done!' : 'I read it — earn points'}
              </button>
              <p className="text-xs text-slate-500">
                {doneInSlot}/{totalInSlot} duas complete
              </p>
            </div>
          </div>
        </article>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-emerald-900">
            More {slot === 'morning' ? 'morning' : 'evening'} duas
          </h4>
          <button
            onClick={() => setExpandAll((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-900"
          >
            {expandAll ? 'Hide all' : 'Show all'}
            {expandAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {(expandAll ? currentSlotData?.duas : currentSlotData?.duas.slice(0, 2))?.map((dua) => (
            <DuaRow
              key={`${slot}-${dua.key}`}
              dua={dua}
              busy={busy}
              onDone={() => markDuaDone(dua, slot)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-lg font-bold text-emerald-900">Dhikr counters</h4>
        <p className="mt-1 text-sm text-slate-600">
          Tap the buttons to count each tasbih. Hit the goal — earn bonus points!
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {payload.dhikr.map((c) => (
            <DhikrRow key={c.key} counter={c} busy={busy} onTick={tickDhikr} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DuaRow({
  dua,
  busy,
  onDone,
}: {
  dua: DuaItem;
  busy: boolean;
  onDone: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        dua.completed
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-emerald-100 bg-white hover:border-emerald-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-emerald-900">{dua.title}</p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              +{dua.points}
            </span>
          </div>
          <p className="mt-2 text-right font-arabic text-xl leading-[2.25rem] text-slate-900">
            {dua.arabic}
          </p>
          <p className="mt-2 text-sm text-slate-600">{dua.translation}</p>
          <p className="mt-1 text-xs text-slate-500">{dua.reference}</p>
        </div>
        <button
          onClick={onDone}
          disabled={busy || dua.completed}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-black shadow transition-colors disabled:opacity-60 ${
            dua.completed
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {dua.completed ? 'Done' : 'Mark'}
        </button>
      </div>
    </div>
  );
}

function DhikrRow({
  counter,
  busy,
  onTick,
}: {
  counter: DhikrItem;
  busy: boolean;
  onTick: (c: DhikrItem, by: number) => void;
}) {
  const pct = Math.min(100, Math.round((counter.count / counter.goal) * 100));
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        counter.milestoneReached ? 'border-amber-300 bg-amber-50' : 'border-emerald-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl">{counter.emoji}</p>
          <p className="mt-1 font-bold text-emerald-900">{counter.label}</p>
          <p className="mt-1 text-right font-arabic text-xl text-slate-900">{counter.arabic}</p>
          <p className="mt-1 text-xs text-slate-500">{counter.translation}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-emerald-800">{counter.count}</p>
          <p className="text-xs text-slate-500">/ {counter.goal}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            counter.milestoneReached
              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
              : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => onTick(counter, 1)}
          disabled={busy}
          className="rounded-xl bg-emerald-500 py-2 text-sm font-black text-white shadow hover:bg-emerald-600 disabled:opacity-60"
        >
          +1
        </button>
        <button
          onClick={() => onTick(counter, 10)}
          disabled={busy}
          className="rounded-xl bg-emerald-600 py-2 text-sm font-black text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          +10
        </button>
        <button
          onClick={() => onTick(counter, Math.max(0, counter.goal - counter.count))}
          disabled={busy || counter.count >= counter.goal}
          className="rounded-xl bg-emerald-700 py-2 text-sm font-black text-white shadow hover:bg-emerald-800 disabled:opacity-60"
        >
          +fill
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Goal reached? +{counter.pointsPerGoal} bonus pts
      </p>
    </div>
  );
}
