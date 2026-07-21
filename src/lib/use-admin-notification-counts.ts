'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminNotificationCounts = {
  chat: number;
  recordings: number;
  competition: number;
  seerah: number;
};

const EMPTY_COUNTS: AdminNotificationCounts = {
  chat: 0,
  recordings: 0,
  competition: 0,
  seerah: 0,
};

export function useAdminNotificationCounts(pollMs = 30000) {
  const [counts, setCounts] = useState<AdminNotificationCounts>(EMPTY_COUNTS);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || localStorage.getItem('admin_auth') !== 'true') {
      return;
    }
    try {
      const res = await fetch('/api/admin/notification-counts', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.counts) setCounts(data.counts);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  return { counts, refresh };
}
