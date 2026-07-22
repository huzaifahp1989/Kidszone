/**
 * Server-side OneSignal REST helpers.
 * Requires ONESIGNAL_REST_API_KEY (+ NEXT_PUBLIC_ONESIGNAL_APP_ID).
 *
 * Visible pushes with priority 10 are used so Android can wake from Doze and
 * deliver when the WTN app is backgrounded/closed (not force-stopped).
 */

import { getOneSignalAppTargets, getServerOneSignalAppId } from '@/lib/onesignal-server-config';

const ONESIGNAL_API = 'https://api.onesignal.com/notifications';
const ONESIGNAL_PLAYERS_API = 'https://onesignal.com/api/v1/players';
const ONESIGNAL_APPS_API = 'https://onesignal.com/api/v1/apps';


export type OneSignalPushPayload = {
  title: string;
  body: string;
  url?: string;
  /** Large image shown on Android / web / iOS rich notifications */
  imageUrl?: string;
  /** OneSignal subscription / player IDs */
  playerIds?: string[];
  /** Supabase user IDs linked via OneSignal.login(external_id) */
  externalUserIds?: string[];
  /** Broadcast to OneSignal segments (e.g. ["Subscribed Users"]) — ignores saved DB tokens */
  includedSegments?: string[];
  /** When true, also try external_id if device IDs get 0 recipients */
  preferBothTargets?: boolean;
  /** Custom data payload (e.g. campaignId for open tracking) */
  data?: Record<string, string>;
  /** Override OneSignal App ID (e.g. WTN native app id) */
  appId?: string;
  /** Override REST API key for this send (used for legacy app fan-out) */
  restApiKey?: string;
};

export type OneSignalSendResult = {
  ok: boolean;
  id?: string;
  recipients?: number;
  error?: string;
  raw?: unknown;
  strategy?: string;
};

function getRestApiKey(override?: string | null): string | null {
  const fromOverride = String(override || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  // Real OneSignal REST keys are long; reject empty / placeholder values.
  if (fromOverride.length >= 20) return fromOverride;
  const key = process.env.ONESIGNAL_REST_API_KEY?.trim().replace(/^["']|["']$/g, '') || '';
  return key.length >= 20 ? key : null;
}

export function isOneSignalServerConfigured(): boolean {
  return Boolean(getRestApiKey() && getServerOneSignalAppId());
}

function authHeaders(apiKey: string, mode: 'key' | 'basic'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: mode === 'key' ? `Key ${apiKey}` : `Basic ${apiKey}`,
  };
}

function isAuthError(raw: unknown, status: number): boolean {
  if (status === 401 || status === 403) return true;
  const text = raw ? JSON.stringify(raw) : '';
  return /access denied|valid API key|unauthorized/i.test(text);
}

/** OneSignal player/subscription IDs are UUIDs; FCM tokens are long opaque strings. */
function looksLikeOneSignalId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function baseNotification(
  title: string,
  body: string,
  url?: string,
  appIdOverride?: string,
  data?: Record<string, string>,
  imageUrl?: string
): Record<string, unknown> {
  const appId = getServerOneSignalAppId(appIdOverride);
  const notification: Record<string, unknown> = {
    app_id: appId,
    headings: { en: title },
    contents: { en: body },
    // High priority helps Android deliver when the app is backgrounded / in Doze
    priority: 10,
    android_visibility: 1,
    // Ensure a visible notification (not a silent data-only push)
    content_available: true,
  };

  if (url) {
    // OneSignal rejects `url` when `app_url` / `web_url` are also set
    notification.app_url = url;
    notification.web_url = url;
  }

  const media = String(imageUrl || '').trim();
  if (media) {
    notification.chrome_web_image = media;
    notification.firefox_icon = media;
    notification.big_picture = media;
    notification.huawei_big_picture = media;
    notification.adm_big_picture = media;
    notification.chrome_web_icon = media;
    notification.ios_attachments = { id1: media };
  }

  if (data && Object.keys(data).length) {
    notification.data = data;
  }

  return notification;
}

export async function sendOneSignalPush(
  payload: OneSignalPushPayload
): Promise<OneSignalSendResult> {
  const apiKey = getRestApiKey(payload.restApiKey);
  if (!apiKey) {
    return { ok: false, error: 'ONESIGNAL_REST_API_KEY is not configured' };
  }
  const restKey = apiKey;

  const title = String(payload.title || '').trim();
  const body = String(payload.body || '').trim();
  if (!title || !body) {
    return { ok: false, error: 'title and body are required' };
  }

  const allIds = Array.from(
    new Set((payload.playerIds || []).map((id) => String(id || '').trim()).filter(Boolean))
  ).slice(0, 2000);

  // Prefer UUID-shaped OneSignal IDs; keep others as a fallback batch
  const onesignalIds = allIds.filter(looksLikeOneSignalId);
  const otherIds = allIds.filter((id) => !looksLikeOneSignalId(id));
  const deviceIds = onesignalIds.length ? onesignalIds : allIds;

  const externalUserIds = Array.from(
    new Set((payload.externalUserIds || []).map((id) => String(id || '').trim()).filter(Boolean))
  ).slice(0, 2000);

  const includedSegments = Array.from(
    new Set((payload.includedSegments || []).map((s) => String(s || '').trim()).filter(Boolean))
  );

  if (!deviceIds.length && !externalUserIds.length && !includedSegments.length) {
    return { ok: false, error: 'No player IDs, external user IDs, or segments provided' };
  }

  async function postNotification(body: Record<string, unknown>) {
    // Prefer modern "Key" auth; fall back to legacy "Basic" for older REST keys
    let last: { response: Response; raw: unknown } | null = null;
    for (const mode of ['key', 'basic'] as const) {
      const response = await fetch(ONESIGNAL_API, {
        method: 'POST',
        headers: authHeaders(restKey, mode),
        body: JSON.stringify(body),
      });
      const raw = await response.json().catch(() => null);
      last = { response, raw };
      if (response.ok || !isAuthError(raw, response.status)) {
        return last;
      }
    }
    return last!;
  }

  type Attempt = { strategy: string; body: Record<string, unknown> };
  const attempts: Attempt[] = [];
  const appIdOverride = payload.appId;
  const data = payload.data;
  const imageUrl = String(payload.imageUrl || '').trim() || undefined;
  const notify = () => baseNotification(title, body, payload.url, appIdOverride, data, imageUrl);

  // Segment broadcast (proves devices exist on this OneSignal app without DB tokens)
  if (includedSegments.length) {
    attempts.push({
      strategy: 'included_segments',
      body: {
        ...notify(),
        included_segments: includedSegments,
      },
    });
  }

  // WTN registerNotification / getPlayerId returns classic player IDs — try those first
  if (deviceIds.length) {
    attempts.push({
      strategy: 'include_player_ids',
      body: {
        ...notify(),
        include_player_ids: deviceIds,
      },
    });
    attempts.push({
      strategy: 'include_subscription_ids',
      body: {
        ...notify(),
        include_subscription_ids: deviceIds,
        target_channel: 'push',
      },
    });
  }

  if (otherIds.length && onesignalIds.length) {
    // Rare: also try non-UUID tokens as player ids
    attempts.push({
      strategy: 'include_player_ids_other',
      body: {
        ...notify(),
        include_player_ids: otherIds,
      },
    });
  }

  if (externalUserIds.length && (payload.preferBothTargets || !deviceIds.length)) {
    attempts.push({
      strategy: 'include_aliases.external_id',
      body: {
        ...notify(),
        include_aliases: { external_id: externalUserIds },
        target_channel: 'push',
      },
    });
  }

  try {
    let best: OneSignalSendResult | null = null;
    const errors: string[] = [];

    for (const attempt of attempts) {
      const { response, raw } = await postNotification(attempt.body);
      const recipients =
        raw && typeof raw === 'object' && 'recipients' in raw
          ? Number((raw as { recipients: unknown }).recipients) || 0
          : 0;
      const id =
        raw && typeof raw === 'object' && 'id' in raw && (raw as { id: unknown }).id
          ? String((raw as { id: unknown }).id)
          : undefined;

      if (!response.ok) {
        const message =
          (raw && typeof raw === 'object' && 'errors' in raw
            ? JSON.stringify((raw as { errors: unknown }).errors)
            : null) ||
          (raw && typeof raw === 'object' && 'error' in raw
            ? String((raw as { error: unknown }).error)
            : null) ||
          `OneSignal HTTP ${response.status}`;

        if (isAuthError(raw, response.status)) {
          const appId = getServerOneSignalAppId(appIdOverride);
          errors.push(
            `${attempt.strategy}: REST API key rejected for app ${appId}. In OneSignal open this app → Settings → Keys & IDs → copy REST API Key into Vercel ONESIGNAL_REST_API_KEY (must be this app, not the old daf8fc36… app).`
          );
          // Auth failure will fail all strategies — stop early
          break;
        }

        errors.push(`${attempt.strategy}: ${message}`);
        continue;
      }

      // OneSignal often returns HTTP 200 with empty id / 0 recipients when nobody is subscribed
      if (!id || recipients <= 0) {
        const osErrors =
          raw && typeof raw === 'object' && 'errors' in raw
            ? JSON.stringify((raw as { errors: unknown }).errors)
            : '';
        errors.push(
          `${attempt.strategy}: 0 recipients${osErrors ? ` ${osErrors}` : ' (unsubscribed or no push token)'}`
        );
        if (!best) {
          best = {
            ok: false,
            id,
            recipients: 0,
            error: osErrors || '0 recipients',
            raw,
            strategy: attempt.strategy,
          };
        }
        continue;
      }

      return {
        ok: true,
        id,
        recipients,
        raw,
        strategy: attempt.strategy,
      };
    }

    if (best && best.recipients === 0) {
      const appId = getServerOneSignalAppId(payload.appId);
      const detail = errors.filter(Boolean).slice(0, 2).join(' · ');
      return {
        ok: false,
        id: best.id,
        recipients: 0,
        strategy: best.strategy,
        raw: best.raw,
        error:
          `0 push recipients on OneSignal app ${appId}` +
          (detail ? ` — ${detail}` : '') +
          `. Player records may exist but are unsubscribed. On each phone: open the WTN app → Allow notifications → Diagnose again.`,
      };
    }

    return {
      ok: false,
      error: errors.join(' | ') || 'OneSignal send failed',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'OneSignal request failed',
    };
  }
}

export type OneSignalMultiAppResult = {
  ok: boolean;
  recipients: number;
  id?: string;
  strategy?: string;
  error?: string;
  perApp: Array<{
    label: string;
    appId: string;
    ok: boolean;
    recipients: number;
    id?: string;
    strategy?: string;
    error?: string;
  }>;
};

/**
 * Fan-out a push to every configured OneSignal app (primary WTN + optional legacy web).
 * Recipients are summed so old website subscribers are included when legacy key is set.
 */
export async function sendOneSignalPushMultiApp(
  payload: Omit<OneSignalPushPayload, 'restApiKey' | 'appId'> & { appId?: string }
): Promise<OneSignalMultiAppResult> {
  const targets = getOneSignalAppTargets(payload.appId);
  if (!targets.length) {
    return {
      ok: false,
      recipients: 0,
      error: 'ONESIGNAL_REST_API_KEY is not configured',
      perApp: [],
    };
  }

  const perApp: OneSignalMultiAppResult['perApp'] = [];
  for (const target of targets) {
    const result = await sendOneSignalPush({
      ...payload,
      appId: target.appId,
      restApiKey: target.restApiKey,
    });
    perApp.push({
      label: target.label,
      appId: target.appId,
      ok: result.ok,
      recipients: result.recipients ?? 0,
      id: result.id,
      strategy: result.strategy,
      error: result.error,
    });
  }

  const recipients = perApp.reduce((sum, row) => sum + row.recipients, 0);
  const firstOk = perApp.find((row) => row.ok);
  const errors = perApp.filter((row) => !row.ok).map((row) => `${row.label}: ${row.error || 'failed'}`);

  if (recipients > 0 || firstOk) {
    return {
      ok: true,
      recipients,
      id: firstOk?.id,
      strategy: perApp.map((r) => `${r.label}/${r.strategy || '?'}:${r.recipients}`).join(', '),
      perApp,
    };
  }

  return {
    ok: false,
    recipients: 0,
    error: errors.join(' | ') || 'OneSignal send failed on all apps',
    perApp,
  };
}

export type OneSignalPlayerLookup = {
  playerId: string;
  found: boolean;
  invalidIdentifier?: boolean;
  deviceType?: number | null;
  externalUserId?: string | null;
  /** OneSignal notification_types: >0 means subscribed, <=0 means unsubscribed. */
  notificationTypes?: number | null;
  /** True when the device is actually subscribed and can receive a push. */
  subscribed?: boolean;
  error?: string;
  appId: string;
};

export type OneSignalAppStats = {
  appId: string;
  ok: boolean;
  /** Total device records registered on the app. */
  players?: number;
  /** Devices that can actually be sent a push (subscribed + valid token). */
  messageablePlayers?: number;
  /** True when the app has Android FCM (Google) push credentials configured. */
  hasAndroidCredentials?: boolean;
  /** True when the app has iOS APNs push credentials configured. */
  hasIosCredentials?: boolean;
  error?: string;
};

/**
 * Fetch app-level push stats from OneSignal. This tells us whether the app has
 * any messageable (deliverable) devices and whether Android FCM / iOS APNs
 * credentials are configured — the usual reason valid players still get 0 recipients.
 */
export async function getOneSignalAppStats(appIdOverride?: string | null): Promise<OneSignalAppStats> {
  const apiKey = getRestApiKey();
  const appId = getServerOneSignalAppId(appIdOverride);
  if (!apiKey) return { appId, ok: false, error: 'Missing REST API key' };

  const url = `${ONESIGNAL_APPS_API}/${encodeURIComponent(appId)}`;
  for (const auth of [`Key ${apiKey}`, `Basic ${apiKey}`]) {
    try {
      const response = await fetch(url, { headers: { Authorization: auth } });
      const raw = await response.json().catch(() => null);
      if (!response.ok) continue;
      const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const gcmKey = String(row.gcm_key || '').trim();
      const apnsEnv = String(row.apns_env || '').trim();
      return {
        appId,
        ok: true,
        players: typeof row.players === 'number' ? row.players : undefined,
        messageablePlayers:
          typeof row.messageable_players === 'number' ? row.messageable_players : undefined,
        hasAndroidCredentials: Boolean(gcmKey) || Boolean(row.android_gcm_sender_id),
        hasIosCredentials: Boolean(apnsEnv),
      };
    } catch {
      /* try next auth */
    }
  }
  return { appId, ok: false, error: 'Could not read app stats (auth failed or wrong app)' };
}

/** Check whether a player/subscription ID exists on the configured OneSignal app. */
export async function lookupOneSignalPlayer(
  playerId: string,
  appIdOverride?: string | null
): Promise<OneSignalPlayerLookup> {
  const apiKey = getRestApiKey();
  const appId = getServerOneSignalAppId(appIdOverride);
  const id = String(playerId || '').trim();

  if (!apiKey || !id) {
    return { playerId: id, found: false, appId, error: 'Missing API key or player id' };
  }

  const url = `${ONESIGNAL_PLAYERS_API}/${encodeURIComponent(id)}?app_id=${encodeURIComponent(appId)}`;

  // Try modern Key auth, then legacy Basic
  for (const auth of [`Key ${apiKey}`, `Basic ${apiKey}`]) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: auth },
      });
      const raw = await response.json().catch(() => null);

      if (response.status === 404) {
        return {
          playerId: id,
          found: false,
          appId,
          error: 'Not found on this OneSignal app (wrong App ID or expired device)',
        };
      }

      if (!response.ok) {
        continue;
      }

      const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const notificationTypes =
        typeof row.notification_types === 'number' ? row.notification_types : null;
      const invalidIdentifier = Boolean(row.invalid_identifier);
      return {
        playerId: id,
        found: true,
        invalidIdentifier,
        deviceType: typeof row.device_type === 'number' ? row.device_type : null,
        externalUserId:
          typeof row.external_user_id === 'string' ? row.external_user_id : null,
        notificationTypes,
        // Subscribed when OneSignal has a valid push token and notification_types > 0.
        subscribed: !invalidIdentifier && (notificationTypes == null || notificationTypes > 0),
        appId,
      };
    } catch {
      /* try next auth */
    }
  }

  return {
    playerId: id,
    found: false,
    appId,
    error: 'Could not look up player (auth failed). Check ONESIGNAL_REST_API_KEY.',
  };
}
