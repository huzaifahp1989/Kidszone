import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { getLegacyOneSignalAppId, getServerOneSignalAppId } from '@/lib/onesignal-server-config';

export const dynamic = 'force-dynamic';

function cleanKey(raw?: string | null) {
  return String(raw || '').trim().replace(/^["\']|["\']$/g, '');
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = cleanKey(process.env.ONESIGNAL_REST_API_KEY);
  const legacyKey = cleanKey(process.env.ONESIGNAL_LEGACY_REST_API_KEY || process.env.ONESIGNAL_WEB_REST_API_KEY);
  const appId = getServerOneSignalAppId();
  const legacyAppId = getLegacyOneSignalAppId();

  const keyMeta = {
    present: Boolean(key),
    length: key.length,
    looksLikeOsV2: key.startsWith('os_v2_'),
    looksLikeUuid: /^[0-9a-f-]{36}$/i.test(key),
    hasWhitespace: /\s/.test(key),
    startsWithKeyPrefix: /^key\s/i.test(key),
  };
  const legacyKeyMeta = {
    present: Boolean(legacyKey),
    length: legacyKey.length,
    looksLikeOsV2: legacyKey.startsWith('os_v2_'),
  };

  async function hit(url: string, auth: string, method = 'GET', body?: unknown) {
    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      const raw = await res.json().catch(() => null);
      const err =
        raw && typeof raw === 'object' && 'errors' in raw
          ? JSON.stringify((raw as { errors: unknown }).errors).slice(0, 160)
          : null;
      return { status: res.status, ok: res.ok, err };
    } catch (e) {
      return { status: 0, ok: false, err: e instanceof Error ? e.message : 'fail' };
    }
  }

  const matrix: Record<string, unknown> = {};
  if (key) {
    for (const [label, id] of [['primary', appId], ['legacy', legacyAppId]] as const) {
      for (const mode of ['Key', 'Basic'] as const) {
        const auth = `${mode} ${key}`;
        matrix[`${label}_apps_api_${mode}`] = await hit(`https://api.onesignal.com/apps/${id}`, auth);
        matrix[`${label}_apps_v1_${mode}`] = await hit(`https://onesignal.com/api/v1/apps/${id}`, auth);
        matrix[`${label}_players_${mode}`] = await hit(
          `https://onesignal.com/api/v1/players?app_id=${encodeURIComponent(id)}&limit=1`,
          auth
        );
        matrix[`${label}_notify_api_${mode}`] = await hit(
          'https://api.onesignal.com/notifications',
          auth,
          'POST',
          {
            app_id: id,
            include_player_ids: ['00000000-0000-4000-8000-000000000001'],
            headings: { en: 'probe' },
            contents: { en: 'probe' },
          }
        );
        matrix[`${label}_notify_v1_${mode}`] = await hit(
          'https://onesignal.com/api/v1/notifications',
          auth,
          'POST',
          {
            app_id: id,
            include_player_ids: ['00000000-0000-4000-8000-000000000001'],
            headings: { en: 'probe' },
            contents: { en: 'probe' },
          }
        );
      }
    }
  }

  return NextResponse.json({
    appId,
    legacyAppId,
    keyMeta,
    legacyKeyMeta,
    matrix,
  });
}
