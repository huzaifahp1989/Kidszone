'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronLeft, Clock, Mail, Save } from 'lucide-react';
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
import { isNativeApp, registerOneSignalPlayerId } from '@/lib/push-notifications';

export default function RemindersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserReminderSettings>(buildDefaultReminderSettings());
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [webPushConfigured, setWebPushConfigured] = useState<boolean | null>(null);
  const [nativePushConfigured, setNativePushConfigured] = useState<boolean | null>(null);
  const [timeZone, setTimeZone] = useState('Europe/London');
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
      if (!res.ok) {
        throw new Error(data.hint || data.error || 'Could not load your reminder settings.');
      }
      if (data.settings) setSettings(data.settings);
      setWebPushConfigured(Boolean(data.webPushConfigured));
      setNativePushConfigured(Boolean(data.nativePushConfigured));
    } catch (err) {
      console.error('[reminders] load error:', err);
      setMessage(err instanceof Error ? err.message : 'Could not load your reminder settings.');
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
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London');
    } catch {
      setTimeZone('Europe/London');
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    registerOneSignalPlayerId({ attempts: 4, delayMs: 500, promptWtn: false, requestPermission: false }).then((id) => {
      setPushStatus(id ? 'This device is registered for push.' : 'Allow push when you save reminders to register this device.');
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

      const anyEnabled = ALL_REMINDER_KEYS.some((key) => clean[key]?.enabled);
      let playerId: string | null = null;
      if (anyEnabled) {
        playerId = await registerOneSignalPlayerId({
          attempts: 5,
          delayMs: 600,
          promptWtn: true,
          requestPermission: true,
        });
      }

      const res = await authJsonFetch('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({ settings: clean, timezone: timeZone }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detailText = data.details ? ` (${data.details})` : '';
        const hintText = data.hint ? ` ${data.hint}` : '';
        throw new Error(`${data.error || 'Save failed'}${detailText}${hintText}`);
      }

      setWebPushConfigured(Boolean(data.webPushConfigured));
      setNativePushConfigured(Boolean(data.nativePushConfigured));
      const pushReady = isNativeApp() ? Boolean(data.nativePushConfigured) : Boolean(data.webPushConfigured);
      if (!anyEnabled) {
        setMessage('Reminders saved and switched off.');
      } else if (!pushReady) {
        setMessage('Reminders saved, but background push is not configured on the server yet.');
      } else if (!playerId) {
        setMessage(
          isNativeApp()
            ? 'Reminders saved, but this device is not subscribed to OneSignal. Allow notifications in app settings and try again.'
            : 'Reminders saved, but this browser is not subscribed to OneSignal. Check Web Push setup and allow notifications.'
        );
      } else {
        setPushStatus('This device is registered for push.');
        setMessage('Reminders saved. OneSignal will send them at your local time, even when the app is closed.');
      }
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

          <div className="mt-2 space-y-2">
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
              {pushStatus || 'Push registration check in progress…'}
            </p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Reminder times use this device&apos;s timezone ({timeZone}).
              {((isNativeApp() && nativePushConfigured === false) ||
                (!isNativeApp() && webPushConfigured === false)) &&
                ' Background delivery needs the matching OneSignal App ID and REST API key configured on the server.'}
              {(isNativeApp() ? nativePushConfigured : webPushConfigured) === null &&
                ' Push delivery setup has not been checked yet.'}
            </p>
          </div>

          <section className="mt-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4" aria-labelledby="email-reminders-title">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 shrink-0 text-teal-700" size={19} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 id="email-reminders-title" className="text-sm font-bold text-teal-950">Parent email reminders</h2>
                <p className="mt-1 text-xs leading-relaxed text-teal-900">
                  {profile?.reminderOptIn
                    ? `On${profile.reminderFrequency ? ` · ${profile.reminderFrequency.replace('_', ' ')}` : ''}. A parent can receive a reminder after 2 days without activity.`
                    : 'Off. Add a parent email and turn reminders on in Profile to help your child remember to take part.'}
                  {' '}Email delivery depends on the site email service being configured.
                </p>
                <Link
                  href="/profile#parent-reminder-settings"
                  className="mt-2 inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-bold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100"
                >
                  Manage email reminders
                </Link>
              </div>
            </div>
          </section>

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
                <p className={`mt-3 text-center text-sm font-bold ${
                  message.startsWith('Reminders saved, but')
                    ? 'text-amber-700'
                    : message.includes('saved')
                      ? 'text-emerald-700'
                      : 'text-red-600'
                }`}>
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
