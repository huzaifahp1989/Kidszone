'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  PUSH_OPEN_OK_PREFIX,
  getPushViewerId,
  reportPushOpen,
} from '@/lib/push-open-client';

/**
 * When a push deep-link opens the app with ?pushCampaign=, record a read/open.
 */
export function PushOpenTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    // Also catch campaign id left in session after a cold start
    const fromQuery = searchParams?.get('pushCampaign');
    let campaignId = fromQuery;
    if (!campaignId && typeof window !== 'undefined') {
      try {
        campaignId = sessionStorage.getItem('pending_push_campaign') || null;
      } catch {
        campaignId = null;
      }
    }
    if (!campaignId) return;

    // Ensure viewer id exists early (used as subscription fallback)
    getPushViewerId();

    const doneKey = `${PUSH_OPEN_OK_PREFIX}${campaignId}`;
    try {
      if (sessionStorage.getItem(doneKey) === '1') return;
    } catch {
      /* ignore */
    }

    const flightKey = `${campaignId}:${user?.id || 'anon'}`;
    if (inFlightRef.current === flightKey) return;
    inFlightRef.current = flightKey;

    void (async () => {
      const ok = await reportPushOpen({
        campaignId,
        userId: user?.id || null,
        source: 'landing',
      });
      if (ok) {
        try {
          sessionStorage.setItem(doneKey, '1');
          sessionStorage.removeItem('pending_push_campaign');
        } catch {
          /* ignore */
        }
      } else {
        try {
          sessionStorage.setItem('pending_push_campaign', campaignId);
        } catch {
          /* ignore */
        }
      }
    })();
  }, [pathname, searchParams, user?.id]);

  return null;
}
