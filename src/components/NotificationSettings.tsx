'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import {
  cancelAllReminders,
  isNativeApp,
  loadNotificationPrefs,
  registerOneSignalPlayerId,
  saveNotificationPrefs,
  scheduleLocalReminders,
  type NotificationPrefs,
} from '@/lib/push-notifications';
import {
  getOneSignalPermissionStatus,
  requestOneSignalPermission,
} from '@/lib/onesignal';
import { useAuth } from '@/lib/auth-context';
import { canRegisterWtnNotification } from '@/lib/wtn-onesignal';

export function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadNotificationPrefs());
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOneSignalPermissionStatus().then(setPermission);
    // Clear old dismiss flags so home prompt can appear again
    try {
      localStorage.removeItem('kz_push_enable_dismissed');
      sessionStorage.removeItem('kz_push_enable_dismissed_session_v3');
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const enablePushOnly = async () => {
    setBusy(true);
    setStatus('Opening Allow prompt…');
    try {
      await requestOneSignalPermission();
      const playerId = await registerOneSignalPlayerId({
        attempts: 10,
        delayMs: 800,
        promptWtn: true,
        requestPermission: true,
      });
      if (playerId && user?.id) {
        try {
          localStorage.setItem(`kz_push_registered_v3:${user.id}`, '1');
        } catch {
          /* ignore */
        }
        setPermission('granted');
        setStatus('Notifications allowed — device registered!');
      } else {
        setStatus(
          canRegisterWtnNotification()
            ? 'Look for the system Allow popup. If blocked, open phone Settings → Apps → Kids Zone → Notifications.'
            : 'Allow the browser popup, or open the WTN app for native push.'
        );
      }
    } catch {
      setStatus('Could not open permission prompt. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const applySettings = async () => {
    setBusy(true);
    setStatus(null);
    try {
      saveNotificationPrefs(prefs);
      const anyOn = prefs.dailyQuiz || prefs.salahReminder || prefs.streakReminder;

      if (!anyOn) {
        await cancelAllReminders();
        setStatus('Reminders turned off.');
        setBusy(false);
        return;
      }

      const granted = await requestOneSignalPermission();
      if (!granted) {
        setPermission('denied');
        setStatus('Please allow notifications in the popup (or check browser / phone settings).');
        setBusy(false);
        return;
      }

      setPermission('granted');
      await scheduleLocalReminders(prefs);
      const playerId = await registerOneSignalPlayerId({
        attempts: 10,
        delayMs: 800,
        promptWtn: true,
        requestPermission: true,
      });

      if (playerId && user?.id) {
        try {
          localStorage.setItem(`kz_push_registered_v3:${user.id}`, '1');
          sessionStorage.setItem('kz_push_enable_dismissed_session_v3', '1');
        } catch {
          /* ignore */
        }
      }

      setStatus(
        playerId
          ? 'Push enabled! Device registered for OneSignal notifications.'
          : 'Permission dialog should have appeared. If you allowed it, wait a few seconds and tap Allow notifications again.'
      );
    } catch {
      setStatus('Could not update reminders. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-card space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          {permission === 'granted' ? (
            <Bell className="text-violet-700" size={20} />
          ) : (
            <BellOff className="text-sand-500" size={20} />
          )}
        </div>
        <div>
          <h3 className="font-bold text-sand-900">OneSignal Push</h3>
          <p className="text-xs text-sand-600">
            {isNativeApp() ? (
              <span className="inline-flex items-center gap-1">
                <Smartphone size={12} /> Mobile app · OneSignal
              </span>
            ) : (
              'Web & mobile push via OneSignal'
            )}
          </p>
        </div>
      </div>

      <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
        Tap <strong>Allow notifications now</strong> to show the system prompt again (required after
        changing OneSignal App ID).
      </p>

      <button
        type="button"
        onClick={enablePushOnly}
        disabled={busy || !user}
        className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {busy ? 'Waiting for Allow…' : 'Allow notifications now'}
      </button>

      <div className="space-y-3">
        {([
          { key: 'dailyQuiz' as const, label: 'Daily quiz reminder', time: '4:00 PM' },
          { key: 'salahReminder' as const, label: 'Salah tracker reminder', time: '12:30 PM' },
          { key: 'streakReminder' as const, label: 'Keep your streak', time: '7:00 PM' },
        ]).map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-sand-200 p-3 hover:bg-violet-50/50"
          >
            <div>
              <p className="text-sm font-semibold text-sand-900">{item.label}</p>
              <p className="text-xs text-sand-500">{item.time}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[item.key]}
              onChange={() => toggle(item.key)}
              className="h-5 w-5 rounded border-violet-300 text-violet-600"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={applySettings}
        disabled={busy || !user}
        className="btn-primary w-full disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save reminder preferences'}
      </button>

      {status && <p className="text-center text-sm font-medium text-violet-700">{status}</p>}
    </div>
  );
}
