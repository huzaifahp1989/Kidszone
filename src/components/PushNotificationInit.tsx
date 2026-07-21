'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { loadNotificationPrefs, scheduleLocalReminders } from '@/lib/push-notifications';
import { initOneSignalNative, isNativeApp, oneSignalLogin } from '@/lib/onesignal';

/** OneSignal + local reminder scheduling on app launch. */
export function PushNotificationInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      if (isNativeApp()) {
        await initOneSignalNative(user.id);
        await oneSignalLogin(user.id);
      }

      const prefs = loadNotificationPrefs();
      const anyOn = prefs.dailyQuiz || prefs.salahReminder || prefs.streakReminder;
      if (anyOn) {
        await scheduleLocalReminders(prefs);
      }
    };

    init();
  }, [user]);

  return null;
}
