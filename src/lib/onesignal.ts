'use client';

import { Capacitor } from '@capacitor/core';
import { ONESIGNAL_APP_ID, ONESIGNAL_WEB_APP_ID } from '@/lib/onesignal-app-id';
import { getPushViewerId, reportPushOpen } from '@/lib/push-open-client';

export { ONESIGNAL_APP_ID, ONESIGNAL_WEB_APP_ID };

let nativeInitialized = false;
let webInitialized = false;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

async function getNativeOneSignal() {
  const mod = await import('@onesignal/capacitor-plugin');
  return mod.default;
}

async function resolveOneSignalSubscriptionId(OneSignal: any): Promise<string | null> {
  try {
    const sub =
      OneSignal?.User?.PushSubscription?.id ||
      OneSignal?.User?.pushSubscription?.id ||
      (await OneSignal?.User?.PushSubscription?.getIdAsync?.()) ||
      null;
    if (sub) return String(sub);
  } catch {
    /* ignore */
  }
  return null;
}

async function reportPushOpenFromEvent(event: any) {
  try {
    const data =
      event?.notification?.additionalData ||
      event?.result?.notification?.additionalData ||
      event?.notification?.data ||
      event?.notification?.additional_data ||
      {};
    const campaignId = String(data?.campaignId || data?.campaign_id || '').trim();
    const onesignalNotificationId = String(
      event?.notification?.notificationId ||
        event?.notification?.id ||
        event?.notification?.notification_id ||
        ''
    ).trim();
    if (!campaignId && !onesignalNotificationId) return;

    let subscriptionId: string | null = null;
    try {
      if (isNativeApp()) {
        const OneSignal = await getNativeOneSignal();
        subscriptionId = await resolveOneSignalSubscriptionId(OneSignal);
      } else if (typeof window !== 'undefined' && window.OneSignal) {
        subscriptionId = await resolveOneSignalSubscriptionId(window.OneSignal);
      }
    } catch {
      /* ignore */
    }

    await reportPushOpen({
      campaignId: campaignId || undefined,
      onesignalNotificationId: onesignalNotificationId || undefined,
      subscriptionId: subscriptionId || getPushViewerId(),
      source: 'click',
    });
  } catch {
    /* ignore */
  }
}

export async function initOneSignalNative(userId?: string): Promise<void> {
  if (!isNativeApp() || nativeInitialized) return;

  const OneSignal = await getNativeOneSignal();
  await OneSignal.initialize(ONESIGNAL_APP_ID);

  if (userId) {
    await OneSignal.login(userId);
  }

  try {
    const notifications = (OneSignal as any).Notifications;
    if (notifications?.addEventListener) {
      notifications.addEventListener('click', (event: any) => {
        void reportPushOpenFromEvent(event);
      });
    }
  } catch {
    /* ignore */
  }

  nativeInitialized = true;
}

export function initOneSignalWeb(onReady?: (userId?: string) => void, userId?: string): void {
  if (typeof window === 'undefined' || webInitialized) {
    if (userId && onReady) onReady(userId);
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      // Must use the web-capable OneSignal app (not the WTN mobile-only app).
      await OneSignal.init({
        appId: ONESIGNAL_WEB_APP_ID,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        notifyButton: { enable: false },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      });

      if (userId) {
        await OneSignal.login(userId);
      }

      try {
        const notifications = (OneSignal as any).Notifications;
        notifications?.addEventListener?.('click', (event: any) => {
          void reportPushOpenFromEvent(event);
        });
      } catch {
        /* ignore */
      }

      webInitialized = true;
      onReady?.(userId);
    } catch (err) {
      console.warn('[OneSignal] web init failed:', err);
    }
  });
}

export async function oneSignalLogin(userId: string): Promise<void> {
  if (isNativeApp()) {
    await initOneSignalNative(userId);
    const OneSignal = await getNativeOneSignal();
    await OneSignal.login(userId);
    return;
  }

  if (window.OneSignal?.login) {
    await window.OneSignal.login(userId);
    return;
  }

  initOneSignalWeb(undefined, userId);
}

export async function oneSignalLogout(): Promise<void> {
  try {
    if (isNativeApp()) {
      const OneSignal = await getNativeOneSignal();
      await OneSignal.logout();
      return;
    }
    if (window.OneSignal?.logout) {
      await window.OneSignal.logout();
    }
  } catch {
    /* ignore */
  }
}

export async function requestOneSignalPermission(): Promise<boolean> {
  if (isNativeApp()) {
    await initOneSignalNative();
    const OneSignal = await getNativeOneSignal();
    return OneSignal.Notifications.requestPermission(true);
  }

  if (window.OneSignal?.Notifications?.requestPermission) {
    return window.OneSignal.Notifications.requestPermission();
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  return false;
}

export async function getOneSignalPermissionStatus(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
  if (isNativeApp()) {
    return 'default';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.OneSignal?.Notifications?.permission) {
    return 'granted';
  }
  return Notification.permission as 'granted' | 'denied' | 'default';
}
