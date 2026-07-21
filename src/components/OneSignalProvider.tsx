'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  initOneSignalNative,
  initOneSignalWeb,
  isNativeApp,
  oneSignalLogin,
  oneSignalLogout,
} from '@/lib/onesignal';
import { registerOneSignalPlayerId } from '@/lib/push-notifications';

/**
 * Initializes OneSignal and silently polls for an existing player ID.
 * Does NOT auto-show permission dialogs (browsers block those without a tap).
 * Use EnablePushPrompt / Profile → Enable push for the visible prompt.
 */
export function OneSignalProvider() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      oneSignalLogout();
      return;
    }

    let cancelled = false;

    const setup = async () => {
      if (isNativeApp()) {
        await initOneSignalNative(user.id);
        if (cancelled) return;
        await registerOneSignalPlayerId({
          attempts: 4,
          delayMs: 1200,
          promptWtn: false,
          requestPermission: false,
        });
        return;
      }

      initOneSignalWeb(async () => {
        if (cancelled) return;
        await oneSignalLogin(user.id);
        if (cancelled) return;
        await registerOneSignalPlayerId({
          attempts: 4,
          delayMs: 1200,
          promptWtn: false,
          requestPermission: false,
        });
      }, user.id);

      if (cancelled) return;
      await registerOneSignalPlayerId({
        attempts: 4,
        delayMs: 1200,
        promptWtn: false,
        requestPermission: false,
      });
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}
