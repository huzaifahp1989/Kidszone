/**
 * WebToNative (WTN) OneSignal / push helpers.
 */

import { Capacitor } from '@capacitor/core';

type WtnOneSignal = {
  getPlayerId?: () => Promise<string | null | undefined>;
};

type WtnRegisterNotificationResponse = {
  type?: string;
  permissionStatus?: string;
  oneSignalPlayerId?: string;
  firebaseToken?: string;
};

type WtnBridge = {
  OneSignal?: WtnOneSignal;
  registerNotification?: (opts: {
    callback: (response: WtnRegisterNotificationResponse) => void;
  }) => void;
  isAndroid?: boolean | (() => boolean);
  isIos?: boolean | (() => boolean);
  isNativeApp?: boolean | (() => boolean);
  getAppVersion?: () => string;
  deviceInfo?: unknown;
};

type WtnWindow = Window & { WTN?: WtnBridge };

export type WtnPushRegistration = {
  playerId: string | null;
  firebaseToken: string | null;
  permissionAllowed: boolean;
};

function getWtn(): WtnBridge | null {
  if (typeof window === 'undefined') return null;
  try {
    return (window as WtnWindow).WTN || null;
  } catch {
    return null;
  }
}

function flagTrue(value: unknown): boolean {
  if (typeof value === 'function') {
    try {
      return Boolean((value as () => boolean)());
    } catch {
      return false;
    }
  }
  return Boolean(value);
}

/** True when WTN exposes registerNotification (native shell or bridge). */
export function canRegisterWtnNotification(): boolean {
  return typeof getWtn()?.registerNotification === 'function';
}

/** Heuristic: running inside a real native WTN / Capacitor shell. */
export function isWtnNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* ignore */
  }

  const wtn = getWtn();
  if (!wtn) return false;

  if (flagTrue(wtn.isNativeApp) || flagTrue(wtn.isAndroid) || flagTrue(wtn.isIos)) {
    return true;
  }

  if (typeof wtn.getAppVersion === 'function' || wtn.deviceInfo) {
    return true;
  }

  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad/i.test(ua) && typeof wtn.registerNotification === 'function') {
    return true;
  }

  return false;
}

export function isWtnAvailable(): boolean {
  return Boolean(getWtn());
}

export function isWtnOneSignalAvailable(): boolean {
  const wtn = getWtn();
  return Boolean(wtn?.OneSignal?.getPlayerId || wtn?.registerNotification);
}

/**
 * Ask WTN for notification permission and return OneSignal player ID + FCM token.
 * Call from a user tap. Works whenever WTN.registerNotification exists.
 */
export function registerWtnNotification(): Promise<WtnPushRegistration> {
  const wtn = getWtn();
  if (!wtn?.registerNotification) {
    return Promise.resolve({
      playerId: null,
      firebaseToken: null,
      permissionAllowed: false,
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: WtnPushRegistration) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timeout = window.setTimeout(() => {
      finish({ playerId: null, firebaseToken: null, permissionAllowed: false });
    }, 25000);

    try {
      wtn.registerNotification!({
        callback: (response) => {
          window.clearTimeout(timeout);
          const playerId = String(response?.oneSignalPlayerId || '').trim() || null;
          const firebaseToken = String(response?.firebaseToken || '').trim() || null;
          const permissionAllowed =
            String(response?.permissionStatus || '').toUpperCase() === 'ALLOWED';
          finish({ playerId, firebaseToken, permissionAllowed });
        },
      });
    } catch (err) {
      window.clearTimeout(timeout);
      console.warn('[WTN] registerNotification failed:', err);
      finish({ playerId: null, firebaseToken: null, permissionAllowed: false });
    }
  });
}

export async function getWtnOneSignalPlayerId(): Promise<string | null> {
  const wtn = getWtn();
  if (!wtn?.OneSignal?.getPlayerId) return null;

  try {
    const playerId = await wtn.OneSignal.getPlayerId();
    const id = String(playerId || '').trim();
    return id || null;
  } catch (err) {
    console.warn('[WTN OneSignal] getPlayerId failed:', err);
    return null;
  }
}
