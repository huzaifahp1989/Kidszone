'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, Clock, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { supabase } from '@/lib/supabase';
import {
  ACTIVITY_REMINDERS,
  ALL_REMINDER_KEYS,
  DEFAULT_REMINDER_TIME,
  PRAYER_REMINDERS,
  REMINDER_META,
  buildDefaultReminderSettings,
  isValidTime,
  mergeReminderSettings,
  normalizeReminderTime,
  type ReminderKey,
  type UserReminderSettings,
} from '@/lib/reminder-types';
import { registerOneSignalPlayerId } from '@/lib/push-notifications';

export default function RemindersPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserReminderSettings>(buildDefaultReminderSettings());
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [confirmingSession, setConfirmingSession] = useState(false);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user?.id) {
      setDataLoading(false);
      return;
    }
    try {
      const res = await authJsonFetch('/api/reminders');
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch {
      // ignore
    } finally {
      setDataLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Capacitor/Android WebViews can take longer to propagate the session from
  // native storage back into the Supabase client. Give the auth listener a
  // short extra window before we conclude the user is signed out.
  useEffect(() => {
    if (authLoading || user) return;
    let cancelled = false;
    setConfirmingSession(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && !data.session?.user) {
          setConfirmingSession(false);
        }
      } catch {
        if (!cancelled) setConfirmingSession(false);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (user) setConfirmingSession(false);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    registerOneSignalPlayerId({ attempts: 6, delayMs: 800, promptWtn: true, requestPermission: false }).then((id) => {
      setPushStatus(id ? 'Push device registered.' : 'Tap Save to register this device for reminders.');
    });
  }, [user?.id]);

  const update = (key: ReminderKey, patch: Partial<{ enabled: boolean; time: string }>) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        enabled: patch.enabled ?? prev[key]?.enabled ?? false,
        time: patch.time !== undefined ? normalizeReminderTime(patch.time) : (prev[key]?.time ?? '08:00'),
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const clean: UserReminderSettings = {};
      for (const key of ALL_REMINDER_KEYS) {
        const entry = settings[key];
        clean[key] = {
          enabled: entry?.enabled ?? false,
          time: normalizeReminderTime(entry?.time ?? '08:00'),
        };
      }

      const res = await authJsonFetch('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({ settings: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setMessage('Reminders saved! They will work even when the app is closed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save reminders.');
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(
    () => [
      { title: 'Daily Activities', keys: ACTIVITY_REMINDERS },
      { title: 'Adhan Times', keys: PRAYER_REMINDERS },
      { title: 'Custom', keys: ['customAlarm'] as ReminderKey[] },
    ],
    []
  );

  if (authLoading || (!user && confirmingSession)) {
    return (
      <div className="min-h-screen bg-islamic-light flex items-center justify-center px-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-islamic-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-islamic-light flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
          <p className="text-lg font-bold text-gray-800 mb-4">Please sign in to set reminders.</p>
          <Link href="/signin" className="inline-block rounded-xl bg-islamic-primary px-6 py-2 font-bold text-white">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-islamic-light py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-islamic-primary mb-4">
          <ChevronLeft size={18} /> Back
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Reminders</h1>
              <p className="text-sm text-gray-600">Set adhan alarms and daily activity reminders.</p>
            </div>
          </div>

          <p className="mt-2 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg px-3 py-2">
            {pushStatus || 'Push registration check in progress…'}
          </p>

          {dataLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-islamic-primary" />
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.title} className="mt-6">
                  <h2 className="text-sm font-black uppercase tracking-wide text-gray-500 mb-3">{group.title}</h2>
                  <div className="space-y-3">
                    {group.keys.map((key) => {
                      const meta = REMINDER_META[key];
                      const entry = settings[key] ?? { enabled: false, time: DEFAULT_REMINDER_TIME[key] };
                      const badTime = !isValidTime(entry.time);

                      return (
                        <div key={key} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <span className="text-xl" aria-hidden>{meta.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900">{meta.label}</p>
                            <p className="text-xs text-gray-500">{meta.body}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Clock size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="time"
                                value={entry.time}
                                onChange={(e) => update(key, { time: e.target.value })}
                                className={`rounded-lg border pl-7 pr-2 py-2 text-sm font-bold ${
                                  badTime ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                                }`}
                              />
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={entry.enabled}
                                onChange={(e) => update(key, { enabled: e.target.checked })}
                                className="peer sr-only"
                              />
                              <div className="h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-violet-600" />
                              <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={save}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 text-base font-bold text-white hover:bg-violet-800 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Save size={18} /> {saving ? 'Saving…' : 'Save Reminders'}
              </button>

              {message && (
                <p className={`mt-3 text-center text-sm font-bold ${message.includes('saved') ? 'text-emerald-700' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
