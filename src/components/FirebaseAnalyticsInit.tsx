'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  initAnalyticsCollection,
  setAnalyticsUserId,
  trackDailyReminderOpened,
  trackKidsZoneOpened,
  trackPageView,
} from '@/lib/analytics';
import { isWtnFirebaseAvailable } from '@/lib/wtn-firebase-analytics';

function isDailyReminderLaunch(searchParams: URLSearchParams | null): boolean {
  if (!searchParams) return false;

  const reminder = String(searchParams.get('reminder') || '').toLowerCase();
  if (reminder === '1' || reminder === 'true' || reminder.includes('daily')) return true;

  for (const key of ['from', 'source', 'utm_campaign', 'utm_medium', 'ref']) {
    const value = String(searchParams.get(key) || '').toLowerCase();
    if (!value) continue;
    if (value.includes('reminder') || value.includes('daily_quiz') || value === 'daily') {
      return true;
    }
  }
  return false;
}

/**
 * Firebase Analytics (web) + optional WTN bridge:
 * - enables collection
 * - page views on every route
 * - kids_zone_opened once
 * - sets user id when signed in
 */
export function FirebaseAnalyticsInit() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedRef = useRef(false);
  const reminderRef = useRef(false);

  useEffect(() => {
    void initAnalyticsCollection();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    void trackPageView(path);

    if (!openedRef.current) {
      openedRef.current = true;
      trackKidsZoneOpened({ path: pathname });
    }

    if (!reminderRef.current && isDailyReminderLaunch(searchParams)) {
      reminderRef.current = true;
      trackDailyReminderOpened({ path: pathname });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!user?.id) return;
    void setAnalyticsUserId(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isWtnFirebaseAvailable()) return;

    let remove: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const handle = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (action) => {
            const id = Number(action.notification?.id || 0);
            if (
              id === 1 ||
              String(action.notification?.title || '').toLowerCase().includes('quiz')
            ) {
              trackDailyReminderOpened({ source: 'local_notification', notificationId: id });
            }
          }
        );
        remove = () => {
          void handle.remove();
        };
      } catch {
        /* Capacitor / notifications unavailable */
      }
    })();

    return () => {
      remove?.();
    };
  }, []);

  return null;
}
