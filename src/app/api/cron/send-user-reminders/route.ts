import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isOneSignalServerConfigured } from '@/lib/onesignal-server';
import { authorizeCron } from '@/lib/cron-auth';
import {
  ACTIVITY_REMINDERS,
  ALL_REMINDER_KEYS,
  REMINDER_META,
  mergeReminderSettings,
  type ReminderKey,
  type UserReminderLastSent,
  type UserReminderSettings,
} from '@/lib/reminder-types';
import { isUserReminderDue } from '@/lib/user-reminder-schedule';
import { loadAllUserOneSignalPlayerIds, sendUserPush } from '@/lib/user-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type UserReminderLastSentWithComeback = UserReminderLastSent & { comeBack?: string };

type UserRow = {
  uid: string;
  role?: string | null;
  reminder_settings?: UserReminderSettings | null;
  reminder_timezone?: string | null;
  reminder_last_sent_at?: UserReminderLastSentWithComeback | null;
};

/** Inactivity "come back" nudge — kids quiet for this many days get a reminder. */
const COMEBACK_INACTIVITY_DAYS = 2;
/** ...but never more often than once every this many days. */
const COMEBACK_MIN_INTERVAL_DAYS = 3;
const COMEBACK_PUSH = {
  title: 'We miss you! 🌟',
  body: "Come back to Kids Zone and take part in today's quiz — earn points and keep your streak!",
  url: '/quiz',
};

async function loadReminderUsers(): Promise<{ users: UserRow[]; error?: string }> {
  const users: UserRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid, role, reminder_settings, reminder_timezone, reminder_last_sent_at')
      .order('uid')
      .range(offset, offset + pageSize - 1);
    if (error) return { users: [], error: error.message };
    const page = (data || []) as unknown as UserRow[];
    users.push(...page);
    if (page.length < pageSize) break;
  }

  // Reminders target learners only (guardians/admins are excluded).
  return { users: users.filter((row) => (row.role ?? 'kid') === 'kid') };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isOneSignalServerConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Configure a OneSignal App ID and matching REST API key before scheduling reminders.' },
      { status: 503 }
    );
  }

  const now = new Date();
  const { users, error } = await loadReminderUsers();
  if (error) return NextResponse.json({ error }, { status: 500 });

  const playerIdsByUser = await loadAllUserOneSignalPlayerIds();

  // Inactivity signal for the "come back" nudge.
  const inactivityCutoff = new Date(now);
  inactivityCutoff.setUTCDate(inactivityCutoff.getUTCDate() - COMEBACK_INACTIVITY_DAYS);
  const cutoffDate = inactivityCutoff.toISOString().slice(0, 10);
  const lastEarnedByUser = new Map<string, string | null>();

  const deliverable = users.filter((u) => (playerIdsByUser.get(u.uid)?.length || 0) > 0);
  if (deliverable.length) {
    const { data: pointsRows } = await supabaseAdmin
      .from('users_points')
      .select('user_id,last_earned_date')
      .in(
        'user_id',
        deliverable.map((u) => u.uid)
      );
    for (const row of (pointsRows || []) as Array<{ user_id: string; last_earned_date: string | null }>) {
      lastEarnedByUser.set(String(row.user_id), row.last_earned_date || null);
    }
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{
    uid: string;
    key: ReminderKey | 'comeBack';
    ok: boolean;
    recipients?: number;
    error?: string;
  }> = [];

  for (const user of deliverable) {
    const settings = mergeReminderSettings(user.reminder_settings ?? null);
    const playerIds = playerIdsByUser.get(user.uid) || [];
    const lastSent: UserReminderLastSentWithComeback = user.reminder_last_sent_at || {};

    for (const key of ALL_REMINDER_KEYS) {
      const entry = settings[key];
      if (!entry?.enabled) continue;
      const timeZone = user.reminder_timezone || 'Europe/London';
      if (!isUserReminderDue({
        now,
        time: entry.time,
        timeZone,
        lastSentAt: lastSent[key],
      })) continue;

      const meta = REMINDER_META[key];
      const push = await sendUserPush({
        userId: user.uid,
        playerIds,
        title: meta.label,
        body: meta.body,
        url: meta.url,
      });
      if (!push.sent) {
        failed += 1;
        results.push({ uid: user.uid, key, ok: false, recipients: push.recipients, error: push.reason || undefined });
        continue;
      }

      const updatedLastSent = { ...lastSent, [key]: now.toISOString() };
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ reminder_last_sent_at: updatedLastSent })
        .eq('uid', user.uid);
      if (updateError) {
        failed += 1;
        results.push({
          uid: user.uid,
          key,
          ok: false,
          recipients: push.recipients,
          error: `Push was delivered but delivery tracking failed: ${updateError.message}`,
        });
        continue;
      }

      lastSent[key] = updatedLastSent[key];
      sent += 1;
      results.push({ uid: user.uid, key, ok: true, recipients: push.recipients });
    }

    // Inactivity "come back" reminder: kids who earned points before but have
    // been quiet for a few days, nudged at most once every few days.
    const activityOn = ACTIVITY_REMINDERS.some((key) => settings[key]?.enabled);
    if (!activityOn) continue;

    const lastEarned = lastEarnedByUser.get(user.uid) || null;
    if (!lastEarned || lastEarned > cutoffDate) continue;

    const lastComeback = lastSent.comeBack ? Date.parse(lastSent.comeBack) : 0;
    if (lastComeback && now.getTime() - lastComeback < COMEBACK_MIN_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
      continue;
    }

    const push = await sendUserPush({
      userId: user.uid,
      playerIds,
      title: COMEBACK_PUSH.title,
      body: COMEBACK_PUSH.body,
      url: COMEBACK_PUSH.url,
    });
    if (!push.sent) {
      failed += 1;
      results.push({
        uid: user.uid,
        key: 'comeBack',
        ok: false,
        recipients: push.recipients,
        error: push.reason || undefined,
      });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ reminder_last_sent_at: { ...lastSent, comeBack: now.toISOString() } })
      .eq('uid', user.uid);
    if (updateError) {
      failed += 1;
      results.push({
        uid: user.uid,
        key: 'comeBack',
        ok: false,
        recipients: push.recipients,
        error: `Push was delivered but delivery tracking failed: ${updateError.message}`,
      });
      continue;
    }

    sent += 1;
    results.push({ uid: user.uid, key: 'comeBack', ok: true, recipients: push.recipients });
  }

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    checked: users.length,
    deliverable: deliverable.length,
    results,
    ranAt: now.toISOString(),
  }, { status: failed > 0 ? 502 : 200 });
}

export async function POST(request: Request) {
  return GET(request);
}
