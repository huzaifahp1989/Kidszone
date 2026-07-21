'use client';

import { authJsonFetch } from '@/lib/auth-headers';

const VIEWER_KEY = 'kids_zone_push_viewer_id';
export const PUSH_OPEN_OK_PREFIX = 'push_open_ok_';

export function getPushViewerId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(VIEWER_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VIEWER_KEY, id);
    }
    return id;
  } catch {
    return `viewer_${Date.now()}`;
  }
}

export async function reportPushOpen(input: {
  campaignId?: string | null;
  onesignalNotificationId?: string | null;
  userId?: string | null;
  subscriptionId?: string | null;
  source?: string;
}): Promise<boolean> {
  const campaignId = String(input.campaignId || '').trim();
  const onesignalNotificationId = String(input.onesignalNotificationId || '').trim();
  if (!campaignId && !onesignalNotificationId) return false;

  const body = {
    campaignId: campaignId || undefined,
    onesignalNotificationId: onesignalNotificationId || undefined,
    userId: input.userId || undefined,
    subscriptionId: input.subscriptionId || getPushViewerId() || undefined,
    source: input.source || 'client',
  };

  try {
    const res = await authJsonFetch('/api/push/opened', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.ok) return true;

    const fallback = await fetch('/api/push/opened', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return fallback.ok;
  } catch {
    try {
      const fallback = await fetch('/api/push/opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return fallback.ok;
    } catch {
      return false;
    }
  }
}
