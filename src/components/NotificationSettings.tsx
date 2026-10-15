'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { registerOneSignalPlayerId } from '@/lib/push-notifications';
import { getOneSignalPermissionStatus } from '@/lib/onesignal';
import { useAuth } from '@/lib/auth-context';

export function NotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getOneSignalPermissionStatus().then(setPermission);
  }, []);

  const enablePush = async () => {
    setBusy(true);
    setStatus('Waiting for notification permission…');
    try {
      const playerId = await registerOneSignalPlayerId({
        attempts: 6,
        delayMs: 600,
        promptWtn: true,
        requestPermission: true,
      });
      if (playerId) {
        setPermission('granted');
        setStatus('This device is registered. Set your reminder times below.');
      } else {
        setStatus('This device did not register. Allow notifications, then check the OneSignal setup and try again.');
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Could not enable push notifications.');
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
          <h3 className="font-bold text-sand-900">Push notifications &amp; reminders</h3>
          <p className="text-xs text-sand-600">
            <span className="inline-flex items-center gap-1">
              <Smartphone size={12} /> OneSignal · web and mobile
            </span>
          </p>
        </div>
      </div>

      <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
        Allow push on this device, then choose times for quizzes, activities, and salah reminders.
        Scheduled reminders are sent by OneSignal even when Kids Zone is closed.
      </p>

      <button
        type="button"
        onClick={() => void enablePush()}
        disabled={busy || !user}
        className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {busy ? 'Waiting for Allow…' : 'Allow notifications on this device'}
      </button>

      <Link href="/reminders" className="btn-primary flex w-full items-center justify-center">
        Manage reminder schedule
      </Link>

      {status && <p role="status" className="text-center text-sm font-medium text-violet-700">{status}</p>}
    </div>
  );
}
