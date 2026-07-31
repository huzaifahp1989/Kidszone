'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import {
  getWtnOneSignalPlayerId,
  canRegisterWtnNotification,
  registerWtnNotification,
} from '@/lib/wtn-onesignal';
import {
  ALL_REMINDER_KEYS,
  REMINDER_META,
  type UserReminderSettings,
} from '@/lib/reminder-types';

export type NotificationPrefs = {
  dailyQuiz: boolean;
  salahReminder: boolean;
  streakReminder: boolean;
};

const PREFS_KEY = 'kz_notification_prefs';
const CHANNEL_ID = 'kids-zone-reminders';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyQuiz: true,
  salahReminder: true,
  streakReminder: false,
};

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Kids Zone Reminders',
    description: 'Daily quiz and salah reminders',
    importance: 4,
    visibility: 1,
  });
}

function nextAtHour(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export async function scheduleLocalReminders(prefs: NotificationPrefs) {
  if (!isNativeApp()) {
    scheduleWebReminders(prefs);
    return;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await ensureAndroidChannel();
  await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] });

  const notifications: { id: number; title: string; body: string; schedule: { at: Date; repeats?: boolean; every?: 'day' | 'week' } }[] = [];

  if (prefs.dailyQuiz) {
    notifications.push({
      id: 1,
      title: '🧠 Daily Quiz is ready!',
      body: 'Open Kids Zone and earn points with today\'s Islamic quiz.',
      schedule: { at: nextAtHour(16, 0), repeats: true, every: 'day' },
    });
  }

  if (prefs.salahReminder) {
    notifications.push({
      id: 2,
      title: '🕌 Salah reminder',
      body: 'Don\'t forget to log your prayers in the Salah Tracker!',
      schedule: { at: nextAtHour(12, 30), repeats: true, every: 'day' },
    });
  }

  if (prefs.streakReminder) {
    notifications.push({
      id: 3,
      title: '⭐ Keep your streak!',
      body: 'Learn something new today — even one quiz counts!',
      schedule: { at: nextAtHour(19, 0), repeats: true, every: 'day' },
    });
  }

  if (notifications.length) {
    await LocalNotifications.schedule({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        channelId: CHANNEL_ID,
        schedule: {
          at: n.schedule.at,
          repeats: n.schedule.repeats,
          every: n.schedule.every,
        },
      })),
    });
  }
}

function scheduleWebReminders(prefs: NotificationPrefs) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const key = 'kz_web_reminder_fired';
  const today = new Date().toDateString();
  if (sessionStorage.getItem(key) === today) return;

  const msUntilQuiz = nextAtHour(16).getTime() - Date.now();
  if (prefs.dailyQuiz && msUntilQuiz > 0 && msUntilQuiz < 24 * 60 * 60 * 1000) {
    window.setTimeout(() => {
      new Notification('🧠 Daily Quiz is ready!', {
        body: 'Open Kids Zone and earn points with today\'s Islamic quiz.',
      });
      sessionStorage.setItem(key, today);
    }, Math.min(msUntilQuiz, 2147483647));
  }
}

function detectPushPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  try {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    }
  } catch {
    /* Capacitor unavailable */
  }
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

async function resolveWebOneSignalId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    // Only the PushSubscription / player ID can be targeted by OneSignal send APIs.
    // User.onesignalId is a different identifier and causes 0-recipient sends.
    const subId = window.OneSignal?.User?.PushSubscription?.id;
    if (subId) return String(subId).trim() || null;

    const userAny = window.OneSignal?.User as
      | {
          PushSubscription?: {
            id?: string;
            getIdAsync?: () => Promise<string | undefined>;
          };
        }
      | undefined;

    if (userAny?.PushSubscription?.getIdAsync) {
      const id = await userAny.PushSubscription.getIdAsync();
      if (id) return String(id).trim() || null;
    }
  } catch {
    /* web SDK not ready */
  }
  return null;
}

async function resolveCapacitorOneSignalId(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@onesignal/capacitor-plugin');
    const OneSignal = mod.default as {
      User?: {
        PushSubscription?: {
          getIdAsync?: () => Promise<string | null | undefined>;
          id?: string;
        };
        pushSubscription?: {
          getIdAsync?: () => Promise<string | null | undefined>;
          id?: string;
        };
      };
    };
    const sub =
      OneSignal.User?.PushSubscription || OneSignal.User?.pushSubscription;
    const subId = (await sub?.getIdAsync?.()) || sub?.id;
    const id = String(subId || '').trim();
    return id || null;
  } catch {
    return null;
  }
}

async function resolvePushIds(options?: { promptWtn?: boolean }): Promise<{
  playerId: string | null;
  firebaseToken: string | null;
}> {
  if (options?.promptWtn !== false && canRegisterWtnNotification()) {
    const registered = await registerWtnNotification();
    if (registered.playerId || registered.firebaseToken) {
      return {
        playerId: registered.playerId,
        firebaseToken: registered.firebaseToken,
      };
    }
  }

  // Only attempt WTN resolution in native app context to avoid browser warnings
  if (isNativeApp()) {
    const wtnId = await getWtnOneSignalPlayerId();
    if (wtnId) return { playerId: wtnId, firebaseToken: null };
  }

  const capacitorId = await resolveCapacitorOneSignalId();
  if (capacitorId) return { playerId: capacitorId, firebaseToken: null };

  const webId = await resolveWebOneSignalId();
  if (webId) return { playerId: webId, firebaseToken: null };

  return { playerId: null, firebaseToken: null };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistToken(token: string, platform: string, provider: 'onesignal' | 'fcm') {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
    if (!headers.Authorization) {
      console.warn('[Push] skip register — auth token not ready yet');
      await sleep(500);
      continue;
    }

    const res = await fetch('/api/push/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({ token, platform, provider }),
    });

    if (res.ok) {
      return true;
    }

    const text = await res.text().catch(() => '');
    console.warn('[Push] register failed:', res.status, text);
    if (res.status !== 401) {
      return false;
    }

    await sleep(700);
  }

  return false;
}

/**
 * Resolve OneSignal player ID (WTN registerNotification → getPlayerId → Capacitor → web)
 * and save to push_notification_tokens.
 *
 * Call from a user tap so browser permission dialogs are allowed.
 */
export async function registerOneSignalPlayerId(options?: {
  attempts?: number;
  delayMs?: number;
  /** When false, only poll IDs (no WTN permission prompt). Default true. */
  promptWtn?: boolean;
  /** Request browser/Capacitor notification permission (needs user gesture). */
  requestPermission?: boolean;
}): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const attempts = options?.attempts ?? 6;
  const delayMs = options?.delayMs ?? 1000;
  const platform = detectPushPlatform();
  let promptWtn = options?.promptWtn ?? true;

  if (options?.requestPermission) {
    try {
      const { requestOneSignalPermission } = await import('@/lib/onesignal');
      await requestOneSignalPermission();
      // OneSignal web: opt into push if available
      const sub = window.OneSignal?.User?.PushSubscription as
        | { optIn?: () => Promise<void>; optedIn?: boolean }
        | undefined;
      if (sub?.optIn && !sub.optedIn) {
        await sub.optIn();
      }
    } catch (err) {
      console.warn('[Push] permission request failed:', err);
    }
  }

  for (let i = 0; i < attempts; i++) {
    try {
      const { playerId, firebaseToken } = await resolvePushIds({ promptWtn });
      promptWtn = false;

      if (playerId) {
        const playerSaved = await persistToken(playerId, platform, 'onesignal');
        const firebaseSaved = firebaseToken
          ? await persistToken(firebaseToken, platform, 'fcm')
          : true;
        if (playerSaved) {
          if (!firebaseSaved) {
            console.warn('[Push] OneSignal saved but FCM fallback token did not persist');
          }
          return playerId;
        }
      }

      if (firebaseToken) {
        const saved = await persistToken(firebaseToken, platform, 'fcm');
        if (saved) {
          return firebaseToken;
        }
      }
    } catch (err) {
      console.warn('[OneSignal] resolve/register failed:', err);
    }

    if (i < attempts - 1) await sleep(delayMs);
  }

  return null;
}

export async function registerPushToken(userId: string, accessToken: string) {
  if (!isNativeApp()) return;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: token.value, platform, provider: 'fcm', userId }),
    });
  });
}

export async function cancelAllReminders() {
  if (isNativeApp()) {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  }
}

const REMINDER_NOTIFICATION_ID_BASE = 1000;

function nextAtTime(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Schedule native local notifications from user reminder settings.
 * Works offline and fires at the device's local time, independent of OneSignal.
 */
export async function scheduleReminderNotifications(settings: UserReminderSettings) {
  if (!isNativeApp()) {
    scheduleWebReminderNotifications(settings);
    return;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await ensureAndroidChannel();

  const existingIds = ALL_REMINDER_KEYS.map((_, i) => ({ id: REMINDER_NOTIFICATION_ID_BASE + i }));
  await LocalNotifications.cancel({ notifications: existingIds });

  const notifications = ALL_REMINDER_KEYS
    .filter((key) => settings[key]?.enabled)
    .map((key, i) => {
      const meta = REMINDER_META[key];
      const time = settings[key]?.time ?? '08:00';
      return {
        id: REMINDER_NOTIFICATION_ID_BASE + i,
        title: meta.label,
        body: meta.body,
        channelId: CHANNEL_ID,
        schedule: {
          at: nextAtTime(time),
          repeats: true,
          every: 'day' as const,
        },
      };
    });

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
}

const WEB_REMINDER_TIMEOUTS_KEY = 'kz_web_reminder_timeouts';

function scheduleWebReminderNotifications(settings: UserReminderSettings) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const existing = sessionStorage.getItem(WEB_REMINDER_TIMEOUTS_KEY);
  if (existing) {
    try {
      const ids = JSON.parse(existing) as number[];
      ids.forEach((id) => window.clearTimeout(id));
    } catch {
      // ignore
    }
  }

  const ids: number[] = [];

  for (const key of ALL_REMINDER_KEYS) {
    const entry = settings[key];
    if (!entry?.enabled) continue;

    const [hour, minute] = entry.time.split(':').map(Number);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);

    const msUntil = target.getTime() - Date.now();
    const meta = REMINDER_META[key];
    const id = window.setTimeout(() => {
      new Notification(meta.label, { body: meta.body });
      // schedule next day roughly
      scheduleWebReminderNotifications(settings);
    }, Math.min(msUntil, 2147483647));
    ids.push(id);
  }

  sessionStorage.setItem(WEB_REMINDER_TIMEOUTS_KEY, JSON.stringify(ids));
}
