import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isOneSignalServerConfigured, sendOneSignalPushMultiApp } from '@/lib/onesignal-server';
import { authorizeCron } from '@/lib/cron-auth';
import {
  ALL_REMINDER_KEYS,
  REMINDER_META,
  type ReminderKey,
  type UserReminderLastSent,
  type UserReminderSettings,
} from '@/lib/reminder-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type UserRow = {
  uid: string;
  reminder_settings?: UserReminderSettings | null;
  reminder_last_sent_at?: UserReminderLastSent | null;
};

function getUtcMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(':').map(Number);
  return hh * 60 + mm;
}

function looksLikeOneSignalId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function sendUserPush(userId: string, title: string, body: string, url: string) {
  if (!isOneSignalServerConfigured()) return { sent: false, reason: 'onesignal_not_configured' };

  const { data: tokens } = await supabaseAdmin
    .from('push_notification_tokens')
    .select('token, provider')
    .eq('user_id', userId)
    .limit(20);

  const playerIds = Array.from(
    new Set(
      (tokens || [])
        .filter((row) => !row.provider || row.provider === 'onesignal')
        .map((row) => String(row.token || '').trim())
        .filter(looksLikeOneSignalId)
    )
  );

  const result = await sendOneSignalPushMultiApp({
    title,
    body,
    url,
    playerIds: playerIds.length ? playerIds : undefined,
    externalUserIds: [userId],
    preferBothTargets: true,
  });

  return { sent: result.ok, recipients: result.recipients, reason: result.error || null };
}

async function loadReminderUsers(): Promise<{ users: UserRow[]; error?: string }> {
  const activeColumns = new Set(['uid', 'reminder_settings']);
  for (let attempt = 0; attempt <= 2; attempt++) {
    const cols = Array.from(activeColumns).join(',');
    const { data, error } = await supabaseAdmin.from('users').select(cols).limit(1000);
    if (!error) {
      return { users: ((data || []) as unknown) as UserRow[] };
    }
    const msg = String(error.message || '');
    const missing = msg.match(/Could not find the '([\w_]+)' column|column\s+"?([\w_]+)"?\s+does not exist/i);
    const col = missing?.[1] || missing?.[2];
    if (col && activeColumns.has(col)) {
      activeColumns.delete(col);
      continue;
    }
    return { users: [], error: msg };
  }
  return { users: [] };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const nowMinutes = getUtcMinutes(now);
  const windowMinutes = 5;

  const { users, error } = await loadReminderUsers();
  if (error) return NextResponse.json({ error }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const results: Array<{ uid: string; key: ReminderKey; ok: boolean; recipients?: number; error?: string }> = [];

  for (const user of users) {
    const settings = user.reminder_settings;
    if (!settings) continue;

    const lastSent = user.reminder_last_sent_at || {};

    for (const key of ALL_REMINDER_KEYS) {
      const entry = settings[key];
      if (!entry?.enabled) continue;
      const targetMinutes = timeToMinutes(entry.time);
      const withinWindow = nowMinutes >= targetMinutes && nowMinutes <= targetMinutes + windowMinutes;

      if (!withinWindow) continue;

      const lastKey = lastSent[key];
      const sentToday = lastKey && new Date(lastKey).toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      if (sentToday) {
        skipped += 1;
        continue;
      }

      const meta = REMINDER_META[key];
      const push = await sendUserPush(user.uid, meta.label, meta.body, meta.url);

      const updates: Record<string, unknown> = {};
      const newLastSent = { ...lastSent, [key]: now.toISOString() };
      updates.reminder_last_sent_at = newLastSent;

      await supabaseAdmin.from('users').update(updates).eq('uid', user.uid);

      if (push.sent) sent += 1;
      results.push({ uid: user.uid, key, ok: push.sent, recipients: push.recipients, error: push.reason || undefined });
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, checked: users.length, results, ranAt: now.toISOString() });
}

export async function POST(request: Request) {
  return GET(request);
}
