'use client';

import { Capacitor } from '@capacitor/core';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import {
  ALL_REMINDER_KEYS,
  REMINDER_META,
  type ReminderKey,
  type UserReminderSettings,
} from '@/lib/reminder-types';

/**
 * Offline alarms for daily tasks.
 *
 * OneSignal / FCM are push services and need a network round-trip, so they cannot
 * ring at an exact time while offline. These alarms are scheduled on the device
 * itself (Android AlarmManager / iOS UNUserNotificationCenter) and fire with no
 * connection at all.
 *
 * To use a custom alarm tone, drop an audio file into
 * `android/app/src/main/res/raw/` (e.g. `alarm_ring.mp3`) and set ALARM_SOUND to
 * the file name. Leave it empty to use the device's default notification sound.
 */
const ALARM_SOUND = '';
const CHANNEL_ID = 'kid-alarms';

// Stable IDs so re-scheduling replaces the previous alarm instead of stacking.
const ALARM_IDS: Record<ReminderKey, number> = {
  dailyQuiz: 101,
  salahTracker: 102,
  keepStreak: 103,
  dailyActivities: 104,
  fajr: 201,
  dhuhr: 202,
  asr: 203,
  maghrib: 204,
  isha: 205,
  customAlarm: 301,
};

/** Device alarms only make sense inside the native (Capacitor) app. */
export function alarmsSupported(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function loadLocalNotifications() {
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

async function ensureChannel(): Promise<void> {
  const LocalNotifications = await loadLocalNotifications();
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Daily Alarms',
    description: 'Offline alarms for daily tasks and adhan times',
    importance: 5, // heads-up banner + sound
    visibility: 1,
    vibration: true,
    lights: true,
    ...(ALARM_SOUND ? { sound: ALARM_SOUND } : {}),
  });
}

export async function requestAlarmPermission(): Promise<boolean> {
  if (!alarmsSupported()) return false;
  try {
    const LocalNotifications = await loadLocalNotifications();
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Re-apply every enabled reminder as a repeating daily device alarm.
 * Idempotent: cancels the known alarm IDs first, then schedules the enabled ones.
 */
export async function syncDailyAlarms(
  settings: UserReminderSettings
): Promise<{ scheduled: number; granted: boolean }> {
  if (!alarmsSupported()) return { scheduled: 0, granted: false };

  try {
    const LocalNotifications = await loadLocalNotifications();

    const granted = await requestAlarmPermission();
    if (!granted) return { scheduled: 0, granted: false };

    await ensureChannel();

    await LocalNotifications.cancel({
      notifications: ALL_REMINDER_KEYS.map((key) => ({ id: ALARM_IDS[key] })),
    });

    const notifications: LocalNotificationSchema[] = [];
    for (const key of ALL_REMINDER_KEYS) {
      const entry = settings[key];
      if (!entry?.enabled) continue;

      const match = String(entry.time || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!match) continue;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) continue;

      const meta = REMINDER_META[key];
      notifications.push({
        id: ALARM_IDS[key],
        title: `${meta.emoji} ${meta.label}`,
        body: meta.body,
        channelId: CHANNEL_ID,
        ...(ALARM_SOUND ? { sound: ALARM_SOUND } : {}),
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        extra: { url: meta.url, key },
      });
    }

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }

    return { scheduled: notifications.length, granted: true };
  } catch (err) {
    console.warn('[local-alarms] sync failed:', err);
    return { scheduled: 0, granted: false };
  }
}

/** Remove all device alarms (e.g. when the user switches reminders off). */
export async function cancelAllAlarms(): Promise<void> {
  if (!alarmsSupported()) return;
  try {
    const LocalNotifications = await loadLocalNotifications();
    await LocalNotifications.cancel({
      notifications: ALL_REMINDER_KEYS.map((key) => ({ id: ALARM_IDS[key] })),
    });
  } catch {
    /* alarms not available */
  }
}

/** Deep-link handler — taps on an alarm open the matching page. */
export async function registerAlarmTapHandler(): Promise<() => void> {
  if (!alarmsSupported()) return () => {};
  try {
    const LocalNotifications = await loadLocalNotifications();
    const handle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action) => {
        const url = (action.notification?.extra as { url?: string } | undefined)?.url;
        if (url && typeof window !== 'undefined') {
          window.location.href = url;
        }
      }
    );
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}
