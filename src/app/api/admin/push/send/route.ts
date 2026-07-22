import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  getLegacyOneSignalAppId,
  getOneSignalAppTargets,
  getServerOneSignalAppId,
} from '@/lib/onesignal-server-config';
import {
  isOneSignalServerConfigured,
  sendOneSignalPushMultiApp,
  type OneSignalMultiAppResult,
} from '@/lib/onesignal-server';
import {
  createPushCampaign,
  finalizePushCampaign,
  listPushCampaigns,
} from '@/lib/push-campaigns';
import { PUSH_REMINDER_PRESET_MAP } from '@/lib/push-reminder-presets';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const PRESETS = PUSH_REMINDER_PRESET_MAP;

const PLAYER_CHUNK = 2000;

type TokenRow = {
  user_id: string;
  token: string;
  platform: string | null;
  provider: string | null;
};

async function loadTokens(userIds?: string[]): Promise<TokenRow[]> {
  let query = supabaseAdmin
    .from('push_notification_tokens')
    .select('user_id, token, platform, provider')
    .limit(5000);

  if (userIds?.length) {
    query = query.in('user_id', userIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .map((row) => ({
      user_id: String(row.user_id || ''),
      token: String(row.token || '').trim(),
      platform: row.platform ? String(row.platform) : null,
      provider: row.provider ? String(row.provider) : null,
    }))
    .filter((row) => row.user_id && row.token)
    .filter((row) => !row.provider || row.provider === 'onesignal');
}

function absoluteUrl(path: string): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app'
  ).replace(/\/$/, '');
  return path.startsWith('http')
    ? path
    : `${appUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function withCampaignParam(url: string, campaignId: string | null): string {
  if (!campaignId) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('pushCampaign', campaignId);
    return u.toString();
  } catch {
    const join = url.includes('?') ? '&' : '?';
    return `${url}${join}pushCampaign=${encodeURIComponent(campaignId)}`;
  }
}

function emptyMultiResult(): OneSignalMultiAppResult {
  return { ok: false, recipients: 0, perApp: [], error: 'No send attempted' };
}

function mergeMultiResults(parts: OneSignalMultiAppResult[]): OneSignalMultiAppResult {
  const perApp = parts.flatMap((p) => p.perApp);
  const recipients = parts.reduce((sum, p) => sum + (p.recipients || 0), 0);
  const firstOk = parts.find((p) => p.ok);
  const strategy = parts
    .filter((p) => p.strategy)
    .map((p) => p.strategy)
    .join(' + ');
  const errors = parts.filter((p) => !p.ok && p.error).map((p) => p.error);

  if (recipients > 0 || firstOk) {
    return {
      ok: true,
      recipients,
      id: firstOk?.id,
      strategy: strategy || firstOk?.strategy,
      perApp,
    };
  }

  return {
    ok: false,
    recipients: 0,
    error: errors.join(' | ') || 'OneSignal send failed',
    perApp,
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isOneSignalServerConfigured()) {
    return NextResponse.json(
      {
        error:
          'OneSignal REST is not configured. Set ONESIGNAL_REST_API_KEY in Vercel / .env.local',
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const presetKey = String(body?.preset || '').trim();
    const preset = PRESETS[presetKey];

    const title = String(body?.title || preset?.title || '').trim();
    const message = String(body?.body || preset?.body || '').trim();
    const path = String(body?.url || preset?.url || '/').trim() || '/';
    const imageUrl = String(body?.imageUrl || body?.image_url || '').trim() || undefined;
    const audience = String(body?.audience || 'all').trim(); // all | user | subscribed | tokens
    const userId = String(body?.userId || '').trim();
    const appIdOverride = String(body?.appId || '').trim() || undefined;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    if (audience === 'user' && !userId) {
      return NextResponse.json(
        { error: 'Pick a user first (search by name or email).' },
        { status: 400 }
      );
    }

    const baseUrl = absoluteUrl(path);
    const targets = getOneSignalAppTargets(appIdOverride);
    const legacyConfigured = targets.some((t) => t.label === 'legacy');

    const campaignId = await createPushCampaign({
      title,
      body: message,
      url: baseUrl,
      audience,
      targetUserId: audience === 'user' ? userId : undefined,
    });

    const trackedUrl = withCampaignParam(baseUrl, campaignId);
    const data = campaignId ? { campaignId } : undefined;

    let result: OneSignalMultiAppResult = emptyMultiResult();
    let targetedPlayers = 0;
    let targetedExternalIds = 0;

    const sendSegment = audience === 'all' || audience === 'subscribed' || audience === 'onesignal';
    const sendKidsZoneTokens =
      audience === 'all' ||
      audience === 'tokens' ||
      audience === 'kids_zone' ||
      audience === 'user';

    if (audience !== 'user' && sendSegment) {
      const segmentResult = await sendOneSignalPushMultiApp({
        title,
        body: message,
        url: trackedUrl,
        imageUrl,
        includedSegments: ['Subscribed Users'],
        appId: appIdOverride,
        data,
      });

      // Always try saved player IDs when segment is empty, or when sending "all"
      const needTokenFanout =
        sendKidsZoneTokens || !segmentResult.ok || (segmentResult.recipients ?? 0) <= 0;

      if (!needTokenFanout) {
        result = segmentResult;
      } else {
        const tokens = await loadTokens();
        const playerIds = Array.from(
          new Set(
            tokens
              .map((t) => t.token)
              .filter((id) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  id
                )
              )
          )
        );
        const externalUserIds = Array.from(new Set(tokens.map((t) => t.user_id)));
        targetedPlayers = playerIds.length;
        targetedExternalIds = playerIds.length ? 0 : externalUserIds.length;

        const tokenParts: OneSignalMultiAppResult[] = [segmentResult];
        for (const chunk of chunkArray(playerIds, PLAYER_CHUNK)) {
          if (!chunk.length) continue;
          tokenParts.push(
            await sendOneSignalPushMultiApp({
              title,
              body: message,
              url: trackedUrl,
              imageUrl,
              playerIds: chunk,
              appId: appIdOverride,
              data,
            })
          );
        }
        if (!playerIds.length) {
          for (const chunk of chunkArray(externalUserIds, PLAYER_CHUNK)) {
            if (!chunk.length) continue;
            tokenParts.push(
              await sendOneSignalPushMultiApp({
                title,
                body: message,
                url: trackedUrl,
                imageUrl,
                externalUserIds: chunk,
                preferBothTargets: true,
                appId: appIdOverride,
                data,
              })
            );
          }
        }
        result = mergeMultiResults(tokenParts);
      }
    } else if (sendKidsZoneTokens) {
      const tokens = await loadTokens(audience === 'user' ? [userId] : undefined);
      const playerIds = Array.from(new Set(tokens.map((t) => t.token)));
      const externalUserIds =
        audience === 'user'
          ? [userId]
          : Array.from(new Set(tokens.map((t) => t.user_id)));

      targetedPlayers = playerIds.length;
      targetedExternalIds =
        audience === 'user' || !playerIds.length ? externalUserIds.length : 0;

      if (!playerIds.length && !externalUserIds.length) {
        return NextResponse.json(
          {
            error:
              audience === 'user'
                ? 'No OneSignal device found for this user. Ask them to open the app while signed in.'
                : 'No Kids Zone push sign-ups found yet.',
            campaignId,
          },
          { status: 400 }
        );
      }

      const parts: OneSignalMultiAppResult[] = [];
      for (const chunk of chunkArray(playerIds, PLAYER_CHUNK)) {
        if (!chunk.length) continue;
        parts.push(
          await sendOneSignalPushMultiApp({
            title,
            body: message,
            url: trackedUrl,
            imageUrl,
            playerIds: chunk,
            externalUserIds: audience === 'user' ? externalUserIds : undefined,
            preferBothTargets: audience === 'user',
            appId: appIdOverride,
            data,
          })
        );
      }
      if (!playerIds.length && externalUserIds.length) {
        parts.push(
          await sendOneSignalPushMultiApp({
            title,
            body: message,
            url: trackedUrl,
            imageUrl,
            externalUserIds,
            preferBothTargets: true,
            appId: appIdOverride,
            data,
          })
        );
      }

      result = mergeMultiResults(parts);

      // Saved device tokens are often stale/unsubscribed. For a broadcast to
      // Kids Zone sign-ups, fall back to the "Subscribed Users" segment so the
      // push still reaches everyone actually subscribed on OneSignal. (Never do
      // this for a single-user send — that must stay targeted.)
      if (
        (audience === 'kids_zone' || audience === 'tokens') &&
        (result.recipients ?? 0) <= 0
      ) {
        const segmentFallback = await sendOneSignalPushMultiApp({
          title,
          body: message,
          url: trackedUrl,
          imageUrl,
          includedSegments: ['Subscribed Users'],
          appId: appIdOverride,
          data,
        });
        result = mergeMultiResults([result, segmentFallback]);
      }
    } else {
      return NextResponse.json(
        { error: `Unknown audience "${audience}"`, campaignId },
        { status: 400 }
      );
    }

    if (campaignId) {
      await finalizePushCampaign(campaignId, result);
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          recipients: result.recipients,
          strategy: result.strategy,
          perApp: result.perApp,
          campaignId,
          legacyConfigured,
          hint: legacyConfigured
            ? undefined
            : `Legacy website app ${getLegacyOneSignalAppId()} is not configured. Set ONESIGNAL_LEGACY_REST_API_KEY in Vercel if you still need the old web app.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      recipients: result.recipients,
      strategy: result.strategy,
      perApp: result.perApp,
      campaignId,
      targetedPlayers,
      targetedExternalIds,
      audience,
      userId: audience === 'user' ? userId : undefined,
      title,
      url: trackedUrl,
      legacyConfigured,
      appsTargeted: targets.map((t) => ({ label: t.label, appId: t.appId })),
      note:
        audience === 'onesignal' || audience === 'subscribed'
          ? 'Sent to the full OneSignal Subscribed Users list.'
          : audience === 'kids_zone' || audience === 'tokens'
            ? 'Sent only to Kids Zone users who enabled push (saved tokens).'
            : audience === 'all'
              ? 'Sent to OneSignal Subscribed Users plus Kids Zone push tokens.'
              : 'Closed-app delivery requires the WTN native app with OneSignal enabled (not only the browser tab).',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send push';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokens = await loadTokens();
    const userIds = Array.from(new Set(tokens.map((t) => t.user_id)));
    const targets = getOneSignalAppTargets();
    const campaigns = await listPushCampaigns(25);

    let usersById = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('uid, name, email')
        .in('uid', userIds.slice(0, 500));

      usersById = new Map(
        (users || []).map((u) => [
          String(u.uid),
          { name: (u.name as string | null) || null, email: (u.email as string | null) || null },
        ])
      );
    }

    const devices = tokens.map((t) => {
      const user = usersById.get(t.user_id);
      return {
        userId: t.user_id,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        platform: t.platform || 'web',
        tokenPreview: `${t.token.slice(0, 8)}…`,
      };
    });

    const seen = new Set<string>();
    const registeredUsers = devices.filter((d) => {
      if (seen.has(d.userId)) return false;
      seen.add(d.userId);
      return true;
    });

    return NextResponse.json({
      configured: isOneSignalServerConfigured(),
      onesignalTokens: tokens.length,
      presets: Object.keys(PRESETS),
      registeredUsers,
      serverAppId: getServerOneSignalAppId(),
      legacyAppId: getLegacyOneSignalAppId(),
      legacyConfigured: targets.some((t) => t.label === 'legacy'),
      appsTargeted: targets.map((t) => ({ label: t.label, appId: t.appId })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        audience: c.audience,
        recipients: c.recipients,
        opens: c.opens,
        createdAt: c.created_at,
        strategy: c.strategy,
      })),
      setupHint:
        campaigns.length === 0
          ? 'If sent history stays empty, run SETUP_PUSH_CAMPAIGN_TRACKING.sql in Supabase.'
          : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load push status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
