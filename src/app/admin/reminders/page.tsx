'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Clock3, LoaderCircle, Search, Send, Save } from 'lucide-react';
import {
  ALL_REMINDER_KEYS,
  REMINDER_META,
  buildDefaultReminderSettings,
  type ReminderKey,
  type UserReminderSettings,
} from '@/lib/reminder-types';

type Learner = { uid: string; name: string; email: string };
type ReminderForm = {
  user: Learner;
  settings: UserReminderSettings;
  timezone: string;
};

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

export default function AdminRemindersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Learner[]>([]);
  const [selected, setSelected] = useState<ReminderForm | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
    }
  }, [router]);

  const searchUsers = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSelected(null);
    const term = query.trim();
    if (term.length < 2) {
      setError('Enter at least two characters to search.');
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/admin/reminders?q=${encodeURIComponent(term)}`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Learner search failed.');
      setUsers(Array.isArray(data.users) ? data.users : []);
      if (!data.users?.length) setMessage('No matching learners found.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Learner search failed.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const selectUser = async (user: Learner) => {
    setLoadingUser(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/reminders?userId=${encodeURIComponent(user.uid)}`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load learner reminders.');
      setSelected({
        user: data.user,
        settings: data.settings || buildDefaultReminderSettings(),
        timezone: data.timezone || 'Europe/London',
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load learner reminders.');
    } finally {
      setLoadingUser(false);
    }
  };

  const updateReminder = (key: ReminderKey, change: { enabled?: boolean; time?: string }) => {
    setSelected((current) => {
      if (!current) return current;
      const entry = current.settings[key] || { enabled: false, time: '08:00' };
      return {
        ...current,
        settings: { ...current.settings, [key]: { ...entry, ...change } },
      };
    });
  };

  const saveSchedule = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save',
          userId: selected.user.uid,
          settings: selected.settings,
          timezone: selected.timezone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save the reminder schedule.');
      setSelected((current) => current ? { ...current, settings: data.settings, timezone: data.timezone } : current);
      setMessage(`Reminder schedule saved for ${selected.user.name || selected.user.email}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the reminder schedule.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!selected || !window.confirm(`Send a test push notification to ${selected.user.name || selected.user.email}?`)) {
      return;
    }
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'test', userId: selected.user.uid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test notification failed.');
      setMessage(`Test push sent to ${data.recipients} device(s). This did not change the learner's reminder schedule.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Test notification failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Admin tools</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Learner reminders</h1>
            <p className="mt-1 text-sm text-slate-600">Set one learner’s reminder schedule and send them a targeted test push.</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            ← Admin dashboard
          </Link>
        </header>

        {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div> : null}
        {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Search className="h-5 w-5 text-violet-600" />Find a learner</h2>
          <form onSubmit={searchUsers} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="Search by name or email"
              aria-label="Search learners"
            />
            <button type="submit" disabled={searching} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
              {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </form>
          {users.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {users.map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => void selectUser(user)}
                  disabled={loadingUser}
                  className={`rounded-xl border p-3 text-left transition hover:border-violet-400 hover:bg-violet-50 disabled:opacity-60 ${selected?.user.uid === user.uid ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}
                >
                  <span className="block font-bold text-slate-900">{user.name || 'Learner'}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">{user.email || user.uid}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {selected ? (
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-violet-700">Selected learner</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">{selected.user.name || 'Learner'}</h2>
              <p className="text-sm text-slate-600">{selected.user.email}</p>
            </div>

            <label className="block max-w-xl">
              <span className="mb-1 block text-sm font-bold text-slate-700">Learner timezone (IANA)</span>
              <input
                value={selected.timezone}
                onChange={(event) => setSelected((current) => current ? { ...current, timezone: event.target.value } : current)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                placeholder="Europe/London"
              />
              <span className="mt-1 block text-xs text-slate-500">Reminder times are interpreted in this learner’s local timezone.</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {ALL_REMINDER_KEYS.map((key) => {
                const entry = selected.settings[key] || { enabled: false, time: '08:00' };
                const reminder = REMINDER_META[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <label className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(event) => updateReminder(key, { enabled: event.target.checked })}
                        className="h-4 w-4 accent-violet-700"
                        aria-label={`Enable ${reminder.label}`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-slate-900">{reminder.emoji} {reminder.label}</span>
                        <span className="block text-xs text-slate-500">{reminder.category}</span>
                      </span>
                    </label>
                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <Clock3 className="h-4 w-4" />
                      <input
                        type="time"
                        value={entry.time}
                        onChange={(event) => updateReminder(key, { time: event.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        aria-label={`${reminder.label} reminder time`}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
              <button type="button" onClick={() => void saveSchedule()} disabled={saving || testing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save schedule
              </button>
              <button type="button" onClick={() => void sendTest()} disabled={saving || testing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60">
                {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test push to learner
              </button>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
              Test sends an immediate notification only to the selected learner’s OneSignal account. If they have not enabled push or opened the app to subscribe, delivery may report zero devices.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
