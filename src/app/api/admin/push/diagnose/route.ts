import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getServerOneSignalAppId } from '@/lib/onesignal-server-config';
import {
  isOneSignalServerConfigured,
  lookupOneSignalPlayer,
} from '@/lib/onesignal-server';
import { ONESIGNAL_APP_ID as PUBLIC_ONESIGNAL_APP_ID } from '@/lib/onesignal-app-id';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DEVICE_TYPE_LABEL: Record<number, string> = {
  0: 'iOS',
  1: 'Android',
  5: 'Chrome Web Push',
  7: 'Safari',
  8: 'Firefox',
  11: 'Email',
  17: 'Huawei',
};

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const onlyUserId = String(searchParams.get('userId') || '').trim();
  const appIdOverride = String(searchParams.get('appId') || '').trim() || undefined;

  const serverAppId = getServerOneSignalAppId(appIdOverride);
  const publicAppId = PUBLIC_ONESIGNAL_APP_ID;

  if (!isOneSignalServerConfigured()) {
    return NextResponse.json({
      configured: false,
      serverAppId,
      publicAppId,
      appIdMismatch: serverAppId !== publicAppId,
      error: 'ONESIGNAL_REST_API_KEY missing',
      tokens: [],
    });
  }

  let query = supabaseAdmin
    .from('push_notification_tokens')
    .select('user_id, token, platform, provider, updated_at')
    .limit(50)
    .order('updated_at', { ascending: false });

  if (onlyUserId) query = query.eq('user_id', onlyUserId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const lookups = [];
  for (const row of rows.slice(0, 20)) {
    const token = String(row.token || '').trim();
    const lookup = await lookupOneSignalPlayer(token, appIdOverride);
    lookups.push({
      userId: row.user_id,
      tokenPreview: `${token.slice(0, 10)}…${token.slice(-4)}`,
      token,
      platform: row.platform,
      provider: row.provider,
      updatedAt: row.updated_at,
      foundOnOneSignal: lookup.found,
      invalidIdentifier: lookup.invalidIdentifier ?? null,
      deviceType: lookup.deviceType,
      deviceLabel:
        lookup.deviceType != null
          ? DEVICE_TYPE_LABEL[lookup.deviceType] || `type ${lookup.deviceType}`
          : null,
      externalUserId: lookup.externalUserId,
      lookupError: lookup.error || null,
    });
  }

  const foundCount = lookups.filter((l) => l.foundOnOneSignal && !l.invalidIdentifier).length;

  return NextResponse.json({
    configured: true,
    serverAppId,
    publicAppId,
    appIdMismatch: serverAppId !== publicAppId,
    hint:
      foundCount === 0
        ? 'No saved tokens exist on this OneSignal app. Paste the WTN OneSignal App ID below, use that app’s REST API key in Vercel, reopen the WTN app to re-register, then diagnose again.'
        : 'At least one token is valid on this OneSignal app.',
    checked: lookups.length,
    validOnApp: foundCount,
    tokens: lookups,
  });
}
