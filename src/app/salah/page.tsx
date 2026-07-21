'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addMonths, format, isSameMonth, isToday, parseISO, subMonths } from 'date-fns';
import Link from 'next/link';
import { Bell, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Navbar, Modal } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { buildCalendarGrid, SALAH_PRAYERS, toDateKey } from '@/lib/salah';
import { supabase } from '@/lib/supabase';
import type { SalahEntry, SalahPrayerKey, SalahStatus, SalahStats } from '@/types/salah';
import { authJsonFetch } from '@/lib/auth-headers';

type PrayerTimeState = {
  dateKey: string;
  timezone: string;
  timings: Partial<Record<SalahPrayerKey, string>>;
};

function dayLabel(value: Date) {
  return format(value, 'EEE');
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export default function SalahPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth() as any;
  const [month, setMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const [entries, setEntries] = useState<SalahEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [weeklyStats, setWeeklyStats] = useState<SalahStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<SalahStats | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editPrayer, setEditPrayer] = useState<SalahPrayerKey>('fajr');
  const [editStatus, setEditStatus] = useState<SalahStatus>('completed');
  const [editPrayedAt, setEditPrayedAt] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderPermission, setReminderPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimeState | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [salahPointsMessage, setSalahPointsMessage] = useState<string | null>(null);
  const salahPointsClaimedRef = useRef(false);
  const reminderTimeouts = useRef<number[]>([]);

  const grid = useMemo(() => buildCalendarGrid(month, 1), [month]);
  const selectedDate = useMemo(() => parseISO(selectedDateKey), [selectedDateKey]);

  const entryByDatePrayer = useMemo(() => {
    const map = new Map<string, SalahEntry>();
    for (const entry of entries) {
      map.set(`${entry.date}:${entry.prayer}`, entry);
    }
    return map;
  }, [entries]);

  const daySummary = useMemo(() => {
    const map = new Map<string, { completed: number; logged: number }>();
    for (const entry of entries) {
      const current = map.get(entry.date) || { completed: 0, logged: 0 };
      current.logged += 1;
      if (entry.status === 'completed') current.completed += 1;
      map.set(entry.date, current);
    }
    return map;
  }, [entries]);

  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to track salah.');

      const from = grid.gridStart.toISOString().slice(0, 10);
      const to = grid.gridEnd.toISOString().slice(0, 10);
      const res = await fetch(`/api/salah/entries?from=${from}&to=${to}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load salah entries');
      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load salah tracker.');
    } finally {
      setLoading(false);
    }
  }, [grid.gridEnd, grid.gridStart, user?.id]);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      if (!token) return;

      const [weeklyRes, monthlyRes] = await Promise.all([
        fetch(`/api/salah/stats?range=weekly&date=${selectedDateKey}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/salah/stats?range=monthly&date=${selectedDateKey}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const weeklyPayload = await weeklyRes.json();
      const monthlyPayload = await monthlyRes.json();

      if (weeklyRes.ok) setWeeklyStats(weeklyPayload.stats || null);
      if (monthlyRes.ok) setMonthlyStats(monthlyPayload.stats || null);
    } catch {
    }
  }, [selectedDateKey, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadEntries();
  }, [authLoading, loadEntries, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadStats();
  }, [loadStats, user?.id, entries.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setReminderPermission('unsupported');
      return;
    }
    setReminderPermission(Notification.permission);
  }, []);

  const tryClaimSalahPoints = useCallback(
    async (dateKey: string, nextEntries: SalahEntry[]) => {
      if (!user?.id || salahPointsClaimedRef.current) return;
      const todayKey = toDateKey(new Date());
      if (dateKey !== todayKey) return;

      const prayers = new Set(
        nextEntries.filter((entry) => entry.date === dateKey).map((entry) => entry.prayer)
      );
      if (!SALAH_PRAYERS.every((p) => prayers.has(p.key))) return;

      salahPointsClaimedRef.current = true;
      try {
        const res = await authJsonFetch('/api/activities/complete', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, activity: 'salah', dateKey }),
        });
        const data = await res.json();
        if (data.pointsAwarded > 0) {
          setSalahPointsMessage(`⭐ +${data.pointsAwarded} points for logging all 5 prayers today!`);
          refreshProfile?.();
        } else if (data.message) {
          setSalahPointsMessage(data.message);
        }
      } catch {
        salahPointsClaimedRef.current = false;
      }
    },
    [user?.id, refreshProfile]
  );

  const saveEntry = useCallback(
    async (dateKey: string, prayer: SalahPrayerKey, status: SalahStatus, prayedAt?: string | null, notes?: string | null) => {
      setSavingKey(`${dateKey}:${prayer}`);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Please sign in to save salah.');

        const res = await fetch('/api/salah/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: dateKey,
            prayer,
            status,
            prayedAt: prayedAt ?? null,
            notes: notes ?? null,
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to save salah');

        const entry: SalahEntry = payload.entry;
        let nextEntries: SalahEntry[] = [];
        setEntries((prev) => {
          const next = prev.filter((e) => !(e.date === entry.date && e.prayer === entry.prayer));
          next.push(entry);
          nextEntries = next.sort((a, b) => `${a.date}:${a.prayer}`.localeCompare(`${b.date}:${b.prayer}`));
          return nextEntries;
        });
        await tryClaimSalahPoints(dateKey, nextEntries);
      } catch (err: any) {
        setError(err?.message || 'Failed to save salah.');
      } finally {
        setSavingKey(null);
      }
    },
    [tryClaimSalahPoints]
  );

  const deleteEntry = useCallback(async (entry: SalahEntry) => {
    setSavingKey(`${entry.date}:${entry.prayer}`);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to delete salah.');

      const res = await fetch(`/api/salah/entries?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to delete salah');
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete salah.');
    } finally {
      setSavingKey(null);
    }
  }, []);

  const openEdit = useCallback(
    (dateKey: string, prayer: SalahPrayerKey) => {
      const existing = entryByDatePrayer.get(`${dateKey}:${prayer}`);
      setEditPrayer(prayer);
      setEditStatus(existing?.status || 'completed');
      const prayedAt = existing?.prayedAt ? existing.prayedAt.slice(0, 16) : '';
      setEditPrayedAt(prayedAt);
      setEditNotes(existing?.notes || '');
      setEditOpen(true);
    },
    [entryByDatePrayer]
  );

  const submitEdit = useCallback(async () => {
    const dateKey = selectedDateKey;
    await saveEntry(dateKey, editPrayer, editStatus, editPrayedAt ? new Date(editPrayedAt).toISOString() : null, editNotes || null);
    setEditOpen(false);
  }, [editNotes, editPrayer, editPrayedAt, editStatus, saveEntry, selectedDateKey]);

  const requestReminders = useCallback(async () => {
    setReminderStatus(null);
    if (reminderPermission === 'unsupported') {
      setReminderStatus('Notifications are not supported on this device.');
      return;
    }

    const permission = await Notification.requestPermission();
    setReminderPermission(permission);
    if (permission !== 'granted') {
      setReminderStatus('Notification permission is required to enable reminders.');
      return;
    }

    if (!navigator.geolocation) {
      setReminderStatus('Location is not supported on this device.');
      return;
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const dateKey = toDateKey(new Date());

    const res = await fetch(`https://api.aladhan.com/v1/timings/${dateKey}?latitude=${lat}&longitude=${lon}&method=2`);
    const payload = await res.json();

    const timings = payload?.data?.timings || {};
    const timezone = String(payload?.data?.meta?.timezone || '');

    const normalized: PrayerTimeState = {
      dateKey,
      timezone,
      timings: {
        fajr: String(timings.Fajr || ''),
        dhuhr: String(timings.Dhuhr || ''),
        asr: String(timings.Asr || ''),
        maghrib: String(timings.Maghrib || ''),
        isha: String(timings.Isha || ''),
      },
    };

    setPrayerTimes(normalized);
    setRemindersEnabled(true);
    setReminderStatus('Prayer reminders enabled for today while the app is open.');
  }, [reminderPermission]);

  const scheduleNotifications = useCallback((times: PrayerTimeState) => {
    reminderTimeouts.current.forEach((id) => window.clearTimeout(id));
    reminderTimeouts.current = [];
    if (reminderPermission !== 'granted') return;

    const now = new Date();
    for (const prayer of SALAH_PRAYERS) {
      const hhmm = times.timings[prayer.key];
      if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) continue;
      const [hStr, mStr] = hhmm.split(':');
      const target = new Date();
      target.setHours(Number(hStr), Number(mStr), 0, 0);
      if (target.getTime() <= now.getTime()) continue;

      const ms = target.getTime() - now.getTime();
      const timeoutId = window.setTimeout(() => {
        new Notification(`Salah reminder: ${prayer.label}`, { body: `It's time for ${prayer.label}.` });
      }, ms);
      reminderTimeouts.current.push(timeoutId);
    }
  }, [reminderPermission]);

  useEffect(() => {
    if (!remindersEnabled || !prayerTimes) return;
    scheduleNotifications(prayerTimes);
    return () => {
      reminderTimeouts.current.forEach((id) => window.clearTimeout(id));
      reminderTimeouts.current = [];
    };
  }, [prayerTimes, remindersEnabled, scheduleNotifications]);

  const pageUser = profile
    ? { name: profile.name, points: profile.points, level: profile.level, badges: profile.badges }
    : undefined;

  const selectedDayEntries = useMemo(() => {
    return SALAH_PRAYERS.map((p) => {
      const key = `${selectedDateKey}:${p.key}`;
      return { prayer: p, entry: entryByDatePrayer.get(key) || null };
    });
  }, [entryByDatePrayer, selectedDateKey]);

  const weekLabels = useMemo(() => {
    const start = grid.gridStart;
    return Array.from({ length: 7 }).map((_, idx) => dayLabel(new Date(start.getTime() + idx * 86400000)));
  }, [grid.gridStart]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdfa] to-white">
        <Navbar loading />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="h-10 w-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdfa] to-white">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-black text-slate-900">Salah Tracker</h1>
            <p className="mt-2 text-sm text-slate-600">Sign in to log your daily prayers and track progress.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/signin" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                Create account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#ffffff_45%,#fff7ed_100%)]">
      <Navbar user={pageUser} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#115e59]">Salah Tracking</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Daily obligatory prayers</h1>
              <p className="mt-2 text-sm text-slate-600">Log each salah as completed or missed, and monitor your weekly and monthly progress.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/tracker" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                <Calendar size={16} /> Daily Deeds
              </Link>
              <button
                type="button"
                onClick={requestReminders}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#115e59] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#115e59]"
              >
                <Bell size={16} />
                Enable reminders
              </button>
            </div>
          </div>
          {reminderStatus && <p className="mt-4 rounded-2xl border border-[#99f6e4] bg-[#f0fdfa] px-4 py-3 text-sm font-bold text-[#115e59]">{reminderStatus}</p>}
          {salahPointsMessage && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{salahPointsMessage}</p>}
          {!salahPointsMessage && (
            <p className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              Log all <strong>5 daily prayers</strong> today to earn <strong>+25 points</strong> (once per day).
            </p>
          )}
          {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Calendar</p>
                <p className="mt-1 text-xl font-black text-slate-900">{format(month, 'MMMM yyyy')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {weekLabels.map((label) => (
                <div key={label} className="px-2">{label}</div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {grid.days.map((day) => {
                const dateKey = toDateKey(day);
                const summary = daySummary.get(dateKey);
                const selected = dateKey === selectedDateKey;
                const isInMonth = isSameMonth(day, grid.monthStart);
                const completed = summary?.completed || 0;
                const logged = summary?.logged || 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={classNames(
                      'rounded-2xl border px-2 py-3 text-left transition',
                      selected ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50',
                      !isInMonth && 'opacity-40'
                    )}
                    aria-label={`Open ${format(day, 'dd MMMM yyyy')}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={classNames('text-sm font-black', selected ? 'text-white' : 'text-slate-900')}>
                        {format(day, 'd')}
                      </span>
                      {isToday(day) && (
                        <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', selected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800')}>
                          Today
                        </span>
                      )}
                    </div>
                    <div className={classNames('mt-2 text-xs font-bold', selected ? 'text-white/80' : 'text-slate-500')}>
                      {logged === 0 ? 'No logs' : `${completed}/5 completed`}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <div className={classNames('h-full', selected ? 'bg-white/80' : 'bg-[#115e59]')} style={{ width: `${Math.min(100, (completed / 5) * 100)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500">
                Loading salah logs...
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selected day</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{format(selectedDate, 'EEEE d MMMM yyyy')}</h2>

              <div className="mt-5 space-y-3">
                {selectedDayEntries.map(({ prayer, entry }) => {
                  const key = `${selectedDateKey}:${prayer.key}`;
                  const busy = savingKey === key;
                  const status = entry?.status || null;
                  return (
                    <div key={prayer.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{prayer.label}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {status ? `Status: ${status}` : 'Not logged yet'}
                          </p>
                        </div>
                        {entry && (
                          <button
                            type="button"
                            onClick={() => deleteEntry(entry)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                            aria-label={`Delete ${prayer.label}`}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEntry(selectedDateKey, prayer.key, 'completed')}
                          disabled={busy}
                          className={classNames(
                            'rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50',
                            status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          )}
                        >
                          Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEntry(selectedDateKey, prayer.key, 'missed')}
                          disabled={busy}
                          className={classNames(
                            'rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50',
                            status === 'missed' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          )}
                        >
                          Missed
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(selectedDateKey, prayer.key)}
                          disabled={busy}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          Edit details
                        </button>
                      </div>

                      {entry?.notes && <p className="mt-3 text-xs font-semibold text-slate-600">Notes: {entry.notes}</p>}
                      {entry?.prayedAt && <p className="mt-1 text-xs font-semibold text-slate-600">Time: {new Date(entry.prayedAt).toLocaleTimeString()}</p>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Reports</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Weekly</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {weeklyStats ? `${Math.round(weeklyStats.completionRate * 100)}%` : '—'}
                  </p>
                  {weeklyStats && (
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {weeklyStats.completed} completed · {weeklyStats.missed} missed · {weeklyStats.unlogged} unlogged
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Monthly</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {monthlyStats ? `${Math.round(monthlyStats.completionRate * 100)}%` : '—'}
                  </p>
                  {monthlyStats && (
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {monthlyStats.completed} completed · {monthlyStats.missed} missed · {monthlyStats.unlogged} unlogged
                    </p>
                  )}
                </div>
              </div>
            </section>

            {prayerTimes && (
              <section className="rounded-[2rem] border border-[#99f6e4] bg-[#f0fdfa] p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#115e59]">Today&apos;s prayer times</p>
                <p className="mt-1 text-sm font-bold text-[#115e59]">{prayerTimes.timezone}</p>
                <div className="mt-4 space-y-2 text-sm font-bold text-[#115e59]">
                  {SALAH_PRAYERS.map((p) => (
                    <div key={p.key} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                      <span>{p.label}</span>
                      <span>{prayerTimes.timings[p.key] || '—'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Salah Entry" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Prayer</label>
            <select
              value={editPrayer}
              onChange={(e) => setEditPrayer(e.target.value as SalahPrayerKey)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
            >
              {SALAH_PRAYERS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as SalahStatus)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
            >
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Time (optional)</label>
            <input
              type="datetime-local"
              value={editPrayedAt}
              onChange={(e) => setEditPrayedAt(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Notes (optional)</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitEdit}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

