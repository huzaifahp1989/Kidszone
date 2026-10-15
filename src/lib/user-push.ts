/**
 * Per-user push delivery for reminders.
 *
 * Targets the learner's saved OneSignal device (player/subscription) IDs first —
 * the same tokens the working broadcast path uses — then falls back to their
 * OneSignal external_id (set via OneSignal.login) only when no device IDs exist.
 * Sending external_id alone is the usual cause of 0-recipient reminder pushes.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isOneSignalServerConfigured,
  sendOneSignalPushMultiApp,
  type OneSignalMultiAppResult,
} from '@/lib/onesignal-server';

const TOKEN_PAGE_SIZE = 1000;

/** OneSignal player/subscription IDs are UUIDs; raw FCM tokens are not. */
export function looksLikeOneSignalPlayerId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || '').trim()
  );
}

/** Saved OneSignal device IDs for a single learner (UUID-shaped only). */
export async function loadUserOneSignalPlayerIds(userId: string): Promise<string[]> {
  const id = String(userId || '').trim();
  if (!id) return [];

  const { data, error } = await supabaseAdmin
    .from('push_notification_tokens')
    .select('token')
    .eq('user_id', id);
  if (error) return [];

  return Array.from(
    new Set(
      (data || [])
        .map((row) => String(row.token || '').trim())
        .filter((token) => token && looksLikeOneSignalPlayerId(token))
    )
  );
}

/** Saved OneSignal device IDs for every learner, keyed by user id. */
export async function loadAllUserOneSignalPlayerIds(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();

  for (let offset = 0; ; offset += TOKEN_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('push_notification_tokens')
      .select('user_id, token')
      .order('user_id')
      .range(offset, offset + TOKEN_PAGE_SIZE - 1);
    if (error) break;

    const rows = (data || []) as Array<{ user_id?: unknown; token?: unknown }>;
    for (const row of rows) {
      const userId = String(row.user_id || '').trim();
      const token = String(row.token || '').trim();
      if (!userId || !token || !looksLikeOneSignalPlayerId(token)) continue;
      const list = map.get(userId) || [];
      if (!list.includes(token)) list.push(token);
      map.set(userId, list);
    }

    if (rows.length < TOKEN_PAGE_SIZE) break;
  }

  return map;
}

export type UserPushResult = {
  sent: boolean;
  recipients: number;
  reason: string | null;
  perApp: OneSignalMultiAppResult['perApp'];
};

/**
 * Send one push to a single learner. Pass `playerIds` when the caller has
 * already loaded the learner's device IDs to avoid a per-user query.
 */
export async function sendUserPush(input: {
  userId: string;
  title: string;
  body: string;
  url: string;
  imageUrl?: string;
  data?: Record<string, string>;
  playerIds?: string[];
}): Promise<UserPushResult> {
  if (!isOneSignalServerConfigured()) {
    return { sent: false, recipients: 0, reason: 'onesignal_not_configured', perApp: [] };
  }

  const base = {
    title: input.title,
    body: input.body,
    url: input.url,
    imageUrl: input.imageUrl,
    data: input.data,
  };

  const playerIds = input.playerIds ?? (await loadUserOneSignalPlayerIds(input.userId));

  if (playerIds.length) {
    const deviceResult = await sendOneSignalPushMultiApp({ ...base, playerIds });
    if (deviceResult.ok && deviceResult.recipients > 0) {
      return {
        sent: true,
        recipients: deviceResult.recipients,
        reason: null,
        perApp: deviceResult.perApp,
      };
    }
  }

  // No saved device IDs delivered — fall back to the learner's OneSignal alias.
  const fallback = await sendOneSignalPushMultiApp({
    ...base,
    externalUserIds: [input.userId],
    preferBothTargets: true,
  });

  return {
    sent: fallback.ok && fallback.recipients > 0,
    recipients: fallback.recipients,
    reason: fallback.error || null,
    perApp: fallback.perApp,
  };
}
