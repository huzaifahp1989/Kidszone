import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isOneSignalServerConfigured,
  sendOneSignalPushMultiApp,
  type OneSignalMultiAppResult,
} from '@/lib/onesignal-server';
import { createPushCampaign, finalizePushCampaign } from '@/lib/push-campaigns';

export type PushFrequency = 'daily' | 'weekly';

export type PushSchedule = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  image_url: string | null;
  audience: string;
  frequency: PushFrequency;
  time_of_day: string;
  /** Legacy single day (0=Sun … 6=Sat). Prefer days_of_week. */
  day_of_week: number | null;
  /** Selected weekdays for weekly schedules (0=Sun … 6=Sat). */
  days_of_week?: number[] | null;
  timezone: string;
  enabled: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Normalize selected weekdays from days_of_week[] or legacy day_of_week. */
export function normalizeDaysOfWeek(input: {
  daysOfWeek?: number[] | null;
  days_of_week?: number[] | null;
  dayOfWeek?: number | null;
  day_of_week?: number | null;
}): number[] {
  const raw = input.daysOfWeek ?? input.days_of_week;
  if (Array.isArray(raw) && raw.length) {
    return Array.from(
      new Set(
        raw
          .map((d) => Number(d))
          .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)
      )
    ).sort((a, b) => a - b);
  }
  const single = input.dayOfWeek ?? input.day_of_week;
  if (single !== null && single !== undefined && Number.isFinite(Number(single))) {
    const d = Number(single);
    if (d >= 0 && d <= 6) return [d];
  }
  return [];
}

const PLAYER_CHUNK = 2000;
const DEFAULT_TZ = 'Europe/London';

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

/** Parse HH:MM or HH:MM:SS → { hour, minute } */
export function parseTimeOfDay(raw: string): { hour: number; minute: number } | null {
  const m = String(raw || '')
    .trim()
    .match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour') === '24' ? '0' : get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

/** Approximate UTC Date for a wall-clock time in a timezone (good enough for schedules). */
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Start from UTC guess, then adjust using the timezone offset at that instant
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wanted - asUtc;
  }
  return new Date(utc);
}

function addDaysYmd(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Next run at or after `from` for the given schedule rules.
 * If `from` is exactly on the slot, returns that slot (for first schedule create use slightly in past to get next).
 */
export function computeNextRunAt(input: {
  frequency: PushFrequency;
  timeOfDay: string;
  dayOfWeek?: number | null;
  daysOfWeek?: number[] | null;
  timezone?: string;
  from?: Date;
}): Date | null {
  const time = parseTimeOfDay(input.timeOfDay);
  if (!time) return null;
  const tz = input.timezone || DEFAULT_TZ;
  const from = input.from || new Date();
  const nowParts = getZonedParts(from, tz);

  const candidates: Date[] = [];

  if (input.frequency === 'daily') {
    for (let offset = 0; offset <= 2; offset++) {
      const ymd = addDaysYmd(nowParts.year, nowParts.month, nowParts.day, offset);
      const at = zonedWallTimeToUtc(ymd.year, ymd.month, ymd.day, time.hour, time.minute, tz);
      if (at.getTime() > from.getTime()) candidates.push(at);
    }
  } else {
    const days = normalizeDaysOfWeek({
      daysOfWeek: input.daysOfWeek,
      dayOfWeek: input.dayOfWeek,
    });
    if (!days.length) return null;
    const daySet = new Set(days);
    for (let offset = 0; offset <= 14; offset++) {
      const ymd = addDaysYmd(nowParts.year, nowParts.month, nowParts.day, offset);
      const at = zonedWallTimeToUtc(ymd.year, ymd.month, ymd.day, time.hour, time.minute, tz);
      const parts = getZonedParts(at, tz);
      if (daySet.has(parts.weekday) && at.getTime() > from.getTime()) {
        candidates.push(at);
        break;
      }
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] || null;
}

export async function listPushSchedules(): Promise<PushSchedule[]> {
  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[push-schedules] list failed:', error.message);
    return [];
  }
  return (data || []) as PushSchedule[];
}

export async function listPushSchedulesDetailed(): Promise<{
  schedules: PushSchedule[];
  error?: string;
  missingServiceRole?: boolean;
  migratedAudience?: number;
}> {
  const { hasSupabaseServiceRole } = await import('@/lib/supabase-admin');
  const missingServiceRole = !hasSupabaseServiceRole();

  // Existing schedules defaulted to kids_zone (often 0 recipients). Point them at OneSignal.
  let migratedAudience = 0;
  if (!missingServiceRole) {
    const migrate = await supabaseAdmin
      .from('push_schedules')
      .update({ audience: 'onesignal', updated_at: new Date().toISOString() })
      .in('audience', ['kids_zone', 'tokens'])
      .select('id');
    if (!migrate.error) migratedAudience = migrate.data?.length || 0;
  }

  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    const rls = /row-level security|42501/i.test(error.message);
    return {
      schedules: [],
      missingServiceRole,
      migratedAudience,
      error: rls
        ? 'Cannot read schedules (RLS). Set SUPABASE_SERVICE_ROLE_KEY in Vercel + .env.local from Supabase → Settings → API → service_role.'
        : error.message,
    };
  }

  return {
    schedules: (data || []) as PushSchedule[],
    missingServiceRole,
    migratedAudience,
    error: missingServiceRole
      ? 'SUPABASE_SERVICE_ROLE_KEY is missing — saves will fail until you add it (Supabase → Settings → API → service_role).'
      : undefined,
  };
}

export async function createPushSchedule(input: {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string | null;
  audience?: string;
  frequency: PushFrequency;
  timeOfDay: string;
  dayOfWeek?: number | null;
  daysOfWeek?: number[] | null;
  timezone?: string;
  enabled?: boolean;
}): Promise<{ schedule?: PushSchedule; error?: string; warning?: string }> {
  if (!parseTimeOfDay(input.timeOfDay)) {
    return { error: 'time_of_day must be HH:MM (24h)' };
  }

  const days =
    input.frequency === 'weekly'
      ? normalizeDaysOfWeek({
          daysOfWeek: input.daysOfWeek,
          dayOfWeek: input.dayOfWeek,
        })
      : [];

  if (input.frequency === 'weekly' && !days.length) {
    return { error: 'Select at least one day of the week' };
  }

  const timezone = input.timezone || DEFAULT_TZ;
  const next = computeNextRunAt({
    frequency: input.frequency,
    timeOfDay: input.timeOfDay,
    dayOfWeek: days[0] ?? null,
    daysOfWeek: days,
    timezone,
  });
  const imageUrl = String(input.imageUrl || '').trim() || null;
  const primaryDay = days[0] ?? null;

  const row: Record<string, unknown> = {
    title: input.title,
    body: input.body,
    url: input.url || '/quiz',
    image_url: imageUrl,
    audience: input.audience || 'onesignal',
    frequency: input.frequency,
    time_of_day: input.timeOfDay,
    day_of_week: input.frequency === 'weekly' ? primaryDay : null,
    days_of_week: input.frequency === 'weekly' ? days : null,
    timezone,
    enabled: input.enabled !== false,
    next_run_at: next?.toISOString() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    // Retry without days_of_week / image_url if columns missing
    const missingDays = /days_of_week|schema cache|column/i.test(error.message);
    const missingImage = /image_url|schema cache|column/i.test(error.message);

    if (missingDays || missingImage) {
      const fallback = { ...row };
      if (missingDays) delete fallback.days_of_week;
      if (missingImage) delete fallback.image_url;

      const retry = await supabaseAdmin
        .from('push_schedules')
        .insert(fallback)
        .select('*')
        .single();
      if (retry.error) {
        return { error: formatScheduleWriteError(retry.error.message) };
      }

      const warnings: string[] = [];
      if (missingDays) {
        warnings.push(
          'Saved with a single day only — run ADD_PUSH_SCHEDULE_DAYS_OF_WEEK.sql in Supabase for multi-day schedules'
        );
      }
      if (missingImage && imageUrl) {
        warnings.push('Saved without image — run ADD_PUSH_SCHEDULE_IMAGE_URL.sql in Supabase');
      }

      return {
        schedule: {
          ...(retry.data as PushSchedule),
          image_url: missingImage ? null : (retry.data as PushSchedule).image_url,
          days_of_week: missingDays ? (primaryDay != null ? [primaryDay] : null) : days,
        },
        warning: warnings.join('. ') || undefined,
      };
    }
    return { error: formatScheduleWriteError(error.message) };
  }

  return { schedule: data as PushSchedule };
}

function formatScheduleWriteError(message: string): string {
  if (/row-level security|42501/i.test(message)) {
    return 'Schedule blocked by RLS. Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role) to Vercel and .env.local, then restart/redeploy.';
  }
  if (message.includes('does not exist') || message.includes('schema cache')) {
    return 'push_schedules table missing — run SETUP_PUSH_SCHEDULES.sql in Supabase';
  }
  return message;
}

export async function updatePushSchedule(
  id: string,
  patch: Partial<{
    title: string;
    body: string;
    url: string;
    imageUrl: string | null;
    audience: string;
    frequency: PushFrequency;
    timeOfDay: string;
    dayOfWeek: number | null;
    daysOfWeek: number[] | null;
    timezone: string;
    enabled: boolean;
  }>
): Promise<{ schedule?: PushSchedule; error?: string; warning?: string }> {
  const { data: existing } = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return { error: 'Schedule not found' };

  const existingRow = existing as PushSchedule;
  const frequency = (patch.frequency || existingRow.frequency) as PushFrequency;
  const timeOfDay = patch.timeOfDay ?? existingRow.time_of_day;
  const timezone = patch.timezone || existingRow.timezone || DEFAULT_TZ;

  const days =
    frequency === 'weekly'
      ? normalizeDaysOfWeek({
          daysOfWeek:
            patch.daysOfWeek !== undefined
              ? patch.daysOfWeek
              : existingRow.days_of_week,
          dayOfWeek:
            patch.dayOfWeek !== undefined ? patch.dayOfWeek : existingRow.day_of_week,
        })
      : [];

  if (!parseTimeOfDay(timeOfDay)) return { error: 'time_of_day must be HH:MM (24h)' };
  if (frequency === 'weekly' && !days.length) {
    return { error: 'Select at least one day of the week' };
  }

  const next = computeNextRunAt({
    frequency,
    timeOfDay,
    dayOfWeek: days[0] ?? null,
    daysOfWeek: days,
    timezone,
  });

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    next_run_at: next?.toISOString() || null,
  };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.body !== undefined) updates.body = patch.body;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl || null;
  if (patch.audience !== undefined) updates.audience = patch.audience;
  if (patch.frequency !== undefined) updates.frequency = patch.frequency;
  if (patch.timeOfDay !== undefined) updates.time_of_day = patch.timeOfDay;
  if (patch.timezone !== undefined) updates.timezone = patch.timezone;
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;

  if (frequency === 'daily') {
    updates.day_of_week = null;
    updates.days_of_week = null;
  } else {
    updates.day_of_week = days[0] ?? null;
    updates.days_of_week = days;
  }

  const { data, error } = await supabaseAdmin
    .from('push_schedules')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    const missingDays = /days_of_week|schema cache|column/i.test(error.message);
    const missingImage =
      patch.imageUrl !== undefined && /image_url|schema cache|column/i.test(error.message);

    if (missingDays || missingImage) {
      const fallback = { ...updates };
      if (missingDays) delete fallback.days_of_week;
      if (missingImage) delete fallback.image_url;
      const retry = await supabaseAdmin
        .from('push_schedules')
        .update(fallback)
        .eq('id', id)
        .select('*')
        .single();
      if (retry.error) return { error: retry.error.message };
      const warnings: string[] = [];
      if (missingDays) {
        warnings.push(
          'Updated with a single day only — run ADD_PUSH_SCHEDULE_DAYS_OF_WEEK.sql for multi-day'
        );
      }
      if (missingImage) {
        warnings.push('Updated without image — run ADD_PUSH_SCHEDULE_IMAGE_URL.sql');
      }
      return {
        schedule: retry.data as PushSchedule,
        warning: warnings.join('. ') || undefined,
      };
    }
    return { error: error.message };
  }
  return { schedule: data as PushSchedule };
}

export async function deletePushSchedule(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from('push_schedules').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function looksLikeOneSignalPlayerId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

async function loadOnesignalTokens() {
  const { data, error } = await supabaseAdmin
    .from('push_notification_tokens')
    .select('user_id, token, provider')
    .limit(5000);
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      user_id: String(row.user_id || ''),
      token: String(row.token || '').trim(),
      provider: row.provider ? String(row.provider) : null,
    }))
    .filter((row) => row.user_id && row.token)
    .filter((row) => !row.provider || row.provider === 'onesignal')
    // Prefer real OneSignal subscription/player UUIDs (skip raw FCM tokens)
    .filter((row) => looksLikeOneSignalPlayerId(row.token));
}

async function pushSavedTokens(input: {
  title: string;
  body: string;
  url: string;
  imageUrl?: string;
  data?: Record<string, string>;
}): Promise<OneSignalMultiAppResult[]> {
  const tokens = await loadOnesignalTokens();
  const playerIds = Array.from(new Set(tokens.map((t) => t.token)));
  const externalUserIds = Array.from(new Set(tokens.map((t) => t.user_id)));
  const parts: OneSignalMultiAppResult[] = [];

  for (const chunk of chunkArray(playerIds, PLAYER_CHUNK)) {
    if (!chunk.length) continue;
    parts.push(
      await sendOneSignalPushMultiApp({
        title: input.title,
        body: input.body,
        url: input.url,
        imageUrl: input.imageUrl,
        playerIds: chunk,
        data: input.data,
      })
    );
  }
  // Only use external ids when we have no player IDs (avoids double-counting)
  if (!playerIds.length) {
    for (const chunk of chunkArray(externalUserIds, PLAYER_CHUNK)) {
      if (!chunk.length) continue;
      parts.push(
        await sendOneSignalPushMultiApp({
          title: input.title,
          body: input.body,
          url: input.url,
          imageUrl: input.imageUrl,
          externalUserIds: chunk,
          preferBothTargets: true,
          data: input.data,
        })
      );
    }
  }

  return parts;
}

/** Send one scheduled (or ad-hoc) audience push using the same fan-out as admin "all". */
export async function broadcastScheduledPush(input: {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string | null;
  audience?: string;
}): Promise<OneSignalMultiAppResult & { campaignId?: string | null; usedAudience?: string }> {
  if (!isOneSignalServerConfigured()) {
    return { ok: false, recipients: 0, perApp: [], error: 'ONESIGNAL_REST_API_KEY not configured' };
  }

  // Default to full OneSignal list — Kids Zone DB tokens often sit on the web app and
  // return 0 recipients on the primary WTN app alone.
  const requested = String(input.audience || 'onesignal').trim() || 'onesignal';
  const imageUrl = String(input.imageUrl || '').trim() || undefined;
  const baseUrl = absoluteUrl(input.url || '/quiz');
  const campaignId = await createPushCampaign({
    title: input.title,
    body: input.body,
    url: baseUrl,
    audience: `schedule:${requested}`,
  });
  const trackedUrl = withCampaignParam(baseUrl, campaignId);
  const data = campaignId ? { campaignId } : undefined;

  const parts: OneSignalMultiAppResult[] = [];
  let usedAudience = requested;

  const pushSegment = async () =>
    sendOneSignalPushMultiApp({
      title: input.title,
      body: input.body,
      url: trackedUrl,
      imageUrl,
      includedSegments: ['Subscribed Users'],
      data,
    });

  const tokenOpts = {
    title: input.title,
    body: input.body,
    url: trackedUrl,
    imageUrl,
    data,
  };

  // Prefer saved player IDs first (exact devices). Fall back to OneSignal
  // "Subscribed Users" only when tokens deliver nobody — avoids empty segment
  // notifications stacking on top of token sends.
  if (requested === 'onesignal' || requested === 'subscribed') {
    const tokenParts = await pushSavedTokens(tokenOpts);
    parts.push(...tokenParts);
    const tokenOk = tokenParts.some((p) => p.ok && (p.recipients ?? 0) > 0);
    if (tokenOk) {
      usedAudience = 'tokens';
    } else {
      parts.push(await pushSegment());
      usedAudience = 'onesignal';
    }
  } else if (requested === 'all') {
    // One segment send + one token send max (not both when segment already covered everyone)
    const segmentResult = await pushSegment();
    parts.push(segmentResult);
    const tokenParts = await pushSavedTokens(tokenOpts);
    parts.push(...tokenParts);
    usedAudience = 'all';
  } else if (requested === 'tokens' || requested === 'kids_zone') {
    const tokenParts = await pushSavedTokens(tokenOpts);
    parts.push(...tokenParts);

    const tokenAttempt = parts.length ? mergeMultiResults(parts) : null;
    if (!parts.length || !tokenAttempt?.ok || (tokenAttempt.recipients ?? 0) <= 0) {
      parts.push(await pushSegment());
      usedAudience = 'onesignal';
    }
  }

  if (!parts.length) {
    return {
      ok: false,
      recipients: 0,
      perApp: [],
      campaignId,
      usedAudience: requested,
      error: `Unknown audience "${requested}". Use onesignal, kids_zone, or all.`,
    };
  }

  const result = mergeMultiResults(parts);
  if (campaignId) await finalizePushCampaign(campaignId, result);
  return {
    ...result,
    campaignId,
    usedAudience,
  };
}

export async function runDuePushSchedules(now = new Date()): Promise<{
  checked: number;
  sent: number;
  skipped: number;
  results: Array<{ id: string; title: string; ok: boolean; recipients: number; error?: string; skipped?: boolean }>;
}> {
  // 1) Explicitly due by next_run_at
  const dueByNext = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now.toISOString())
    .order('next_run_at', { ascending: true })
    .limit(50);

  // 2) Also match by London clock time (covers wrong/null next_run_at + infrequent crons)
  const allEnabled = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .eq('enabled', true)
    .limit(100);

  if (dueByNext.error && allEnabled.error) {
    console.warn(
      '[push-schedules] due query failed:',
      dueByNext.error?.message || allEnabled.error?.message
    );
    return { checked: 0, sent: 0, skipped: 0, results: [] };
  }

  const byId = new Map<string, PushSchedule>();
  for (const row of (dueByNext.data || []) as PushSchedule[]) {
    byId.set(row.id, row);
  }

  const london = getZonedParts(now, DEFAULT_TZ);
  const nowMinutes = london.hour * 60 + london.minute;

  for (const row of (allEnabled.data || []) as PushSchedule[]) {
    if (byId.has(row.id)) continue;
    const time = parseTimeOfDay(row.time_of_day);
    if (!time) continue;

    if (row.frequency === 'weekly') {
      const days = normalizeDaysOfWeek(row);
      if (!days.includes(london.weekday)) continue;
    }

    const targetMinutes = time.hour * 60 + time.minute;
    // Once today's UK time has passed, include it — Hobby may only cron once/day.
    const delta = nowMinutes - targetMinutes;
    if (delta < 0) continue;

    const last = row.last_sent_at ? Date.parse(row.last_sent_at) : 0;
    // Multi-day weekly can fire several times a week — use a same-day gap, not 5 days.
    const selectedDays = row.frequency === 'weekly' ? normalizeDaysOfWeek(row) : [];
    const minGapMs =
      row.frequency === 'weekly' && selectedDays.length <= 1
        ? 5 * 24 * 60 * 60 * 1000
        : 18 * 60 * 60 * 1000;
    if (last && now.getTime() - last < minGapMs) continue;

    byId.set(row.id, row);
  }

  // Oldest due first; never blast every overdue row in one cron tick
  const dueAll = Array.from(byId.values()).sort((a, b) => {
    const aT = a.next_run_at ? Date.parse(a.next_run_at) : 0;
    const bT = b.next_run_at ? Date.parse(b.next_run_at) : 0;
    return aT - bT;
  });

  const results: Array<{
    id: string;
    title: string;
    ok: boolean;
    recipients: number;
    error?: string;
    skipped?: boolean;
  }> = [];
  let sent = 0;
  let skipped = 0;

  /** Only deliver if the slot is recent — clear ancient backlog without spamming. */
  const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
  /** Hard cap: one push per cron / Run due click */
  const MAX_SENDS_PER_RUN = 1;

  for (const row of dueAll) {
    const next = computeNextRunAt({
      frequency: row.frequency,
      timeOfDay: row.time_of_day,
      dayOfWeek: row.day_of_week,
      daysOfWeek: row.days_of_week,
      timezone: row.timezone || DEFAULT_TZ,
      from: now,
    });

    const selectedDays = row.frequency === 'weekly' ? normalizeDaysOfWeek(row) : [];
    const minGapMs =
      row.frequency === 'weekly' && selectedDays.length <= 1
        ? 5 * 24 * 60 * 60 * 1000
        : 18 * 60 * 60 * 1000;
    const last = row.last_sent_at ? Date.parse(row.last_sent_at) : 0;
    if (last && now.getTime() - last < minGapMs) {
      // Already sent recently — bump next_run so it stops looking "due"
      await supabaseAdmin
        .from('push_schedules')
        .update({
          next_run_at: next?.toISOString() || null,
          updated_at: now.toISOString(),
        })
        .eq('id', row.id);
      skipped += 1;
      results.push({
        id: row.id,
        title: row.title,
        ok: true,
        recipients: 0,
        skipped: true,
        error: 'Skipped — already sent recently',
      });
      continue;
    }

    const dueAt = row.next_run_at ? Date.parse(row.next_run_at) : now.getTime();
    const stale = now.getTime() - dueAt > FRESH_WINDOW_MS;

    // Clear stale backlog (failed retries piled up) without sending
    if (stale || sent >= MAX_SENDS_PER_RUN) {
      await supabaseAdmin
        .from('push_schedules')
        .update({
          next_run_at: next?.toISOString() || null,
          updated_at: now.toISOString(),
        })
        .eq('id', row.id);
      skipped += 1;
      results.push({
        id: row.id,
        title: row.title,
        ok: true,
        recipients: 0,
        skipped: true,
        error: stale
          ? 'Skipped stale overdue slot — advanced to next run'
          : 'Skipped — only one schedule sends per run',
      });
      continue;
    }

    const sendResult = await broadcastScheduledPush({
      title: row.title,
      body: row.body,
      url: row.url || '/quiz',
      imageUrl: row.image_url,
      audience: row.audience || 'onesignal',
    });

    // Always advance next_run_at so a failed send cannot pile up and blast later
    const updates: Record<string, unknown> = {
      next_run_at: next?.toISOString() || null,
      updated_at: now.toISOString(),
    };
    if (sendResult.ok) {
      updates.last_sent_at = now.toISOString();
      if (
        sendResult.usedAudience &&
        sendResult.usedAudience !== row.audience &&
        (row.audience === 'kids_zone' || row.audience === 'tokens')
      ) {
        updates.audience = sendResult.usedAudience;
      }
      sent += 1;
    }

    await supabaseAdmin.from('push_schedules').update(updates).eq('id', row.id);

    results.push({
      id: row.id,
      title: row.title,
      ok: sendResult.ok,
      recipients: sendResult.recipients,
      error: sendResult.error,
    });
  }

  return { checked: dueAll.length, sent, skipped, results };
}

/** Force-send one schedule immediately (admin), then advance next_run_at. */
export async function sendPushScheduleNow(
  id: string
): Promise<{
  ok: boolean;
  recipients?: number;
  error?: string;
  campaignId?: string | null;
  schedule?: PushSchedule;
}> {
  const { data: row, error } = await supabaseAdmin
    .from('push_schedules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: error?.message || 'Schedule not found' };
  }

  const schedule = row as PushSchedule;
  const now = new Date();
  const sendResult = await broadcastScheduledPush({
    title: schedule.title,
    body: schedule.body,
    url: schedule.url || '/quiz',
    imageUrl: schedule.image_url,
    audience: schedule.audience || 'onesignal',
  });

  const next = computeNextRunAt({
    frequency: schedule.frequency,
    timeOfDay: schedule.time_of_day,
    dayOfWeek: schedule.day_of_week,
    daysOfWeek: schedule.days_of_week,
    timezone: schedule.timezone || DEFAULT_TZ,
    from: now,
  });

  // Only advance the schedule after a successful delivery (failed sends must be retryable)
  if (!sendResult.ok) {
    return {
      ok: false,
      recipients: sendResult.recipients,
      error: sendResult.error,
      campaignId: sendResult.campaignId,
      schedule,
    };
  }

  const updates: Record<string, unknown> = {
    last_sent_at: now.toISOString(),
    next_run_at: next?.toISOString() || null,
    updated_at: now.toISOString(),
  };
  if (
    sendResult.usedAudience &&
    sendResult.usedAudience !== schedule.audience &&
    (schedule.audience === 'kids_zone' || schedule.audience === 'tokens')
  ) {
    updates.audience = sendResult.usedAudience;
  }

  const { data: updated } = await supabaseAdmin
    .from('push_schedules')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  return {
    ok: true,
    recipients: sendResult.recipients,
    error: sendResult.error,
    campaignId: sendResult.campaignId,
    schedule: (updated as PushSchedule) || schedule,
  };
}
