'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import {
  getWtnOneSignalPlayerId,
  canRegisterWtnNotification,
  registerWtnNotification,
} from '@/lib/wtn-onesignal';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
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
      const result = await res.json().catch(() => null);
      if (result?.ok) return true;
      console.warn('[Push] server did not confirm token persistence:', result?.error || result);
      return false;
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
