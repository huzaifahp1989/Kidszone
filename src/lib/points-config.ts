import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Keys stored in the points_config table. Values fall back to these safe
 * defaults if the row is missing (e.g. migration not yet applied).
 */
export const POINTS_CONFIG_DEFAULTS: Record<string, number> = {
  quiz_correct: 25,
  game_activity: 25,
  arabic_activity: 25,
  quran_activity: 25,
  daily_bonus: 50,
  weekly_bonus: 50,
  milestone_bonus: 30,
  milestone_threshold: 3,
};

export type PointsConfigKey = keyof typeof POINTS_CONFIG_DEFAULTS;

let cachedAt = 0;
let cachedMap: Map<string, number> | null = null;
const CACHE_TTL_MS = 30_000;

/**
 * Read all points-config rows from the DB. Cached for 30s to avoid hammering
 * the DB on every request. Falls back to safe defaults on any error.
 */
export async function getPointsConfigMap(): Promise<Map<string, number>> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }

  const map = new Map<string, number>(
    Object.entries(POINTS_CONFIG_DEFAULTS).map(([k, v]) => [k, v])
  );

  try {
    const { data, error } = await supabaseAdmin.from('points_config').select('key, value');
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const v = Number(row.value);
        if (Number.isFinite(v) && v >= 0) {
          map.set(String(row.key), v);
        }
      }
    }
  } catch {
    /* fall back to defaults */
  }

  cachedMap = map;
  cachedAt = now;
  return map;
}

export async function getPointsConfigValue(key: PointsConfigKey): Promise<number> {
  const map = await getPointsConfigMap();
  return map.get(key) ?? POINTS_CONFIG_DEFAULTS[key];
}

/** Invalidate the in-process cache (call after an admin save). */
export function invalidatePointsConfigCache() {
  cachedMap = null;
  cachedAt = 0;
}
