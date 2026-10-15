import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getPointsConfigMap,
  invalidatePointsConfigCache,
  POINTS_CONFIG_DEFAULTS,
  type PointsConfigKey,
} from '@/lib/points-config';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) =>
  request.headers.get('x-admin-auth') === 'true';

const ALLOWED_KEYS = Object.keys(POINTS_CONFIG_DEFAULTS) as PointsConfigKey[];

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const map = await getPointsConfigMap();
    const config = Object.fromEntries(
      ALLOWED_KEYS.map((key) => [key, map.get(key) ?? POINTS_CONFIG_DEFAULTS[key]])
    );
    return NextResponse.json({ config, defaults: POINTS_CONFIG_DEFAULTS });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load points config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, number> = {};

    for (const key of ALLOWED_KEYS) {
      if (body?.[key] !== undefined) {
        const v = Number(body[key]);
        if (!Number.isFinite(v) || v < 0) {
          return NextResponse.json(
            { error: `Invalid value for ${key}: must be a non-negative number` },
            { status: 400 }
          );
        }
        updates[key] = Math.floor(v);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 });
    }

    const rows = Object.entries(updates).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('points_config')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidatePointsConfigCache();

    return NextResponse.json({ ok: true, updated: updates });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to save points config' },
      { status: 500 }
    );
  }
}
