import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isOneSignalServerConfigured } from '@/lib/onesignal-server';
import { authorizeCron } from '@/lib/cron-auth';
import {
  mergeReminderSettings,
  type UserReminderLastSent,
  type UserReminderSettings,
} from '@/lib/reminder-types';
import { isUserReminderDue } from '@/lib/user-reminder-schedule';
import { loadAllUserOneSignalPlayerIds, sendUserPush } from '@/lib/user-push';
import { hourToReminderTime, inferActiveHour } from '@/lib/active-hour';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type UserRow = {
  uid: string;
  reminder_settings?: UserReminderSettings | null;
  reminder_timezone?: string | null;
  reminder_last_sent_at?: UserReminderLastSent | null;
};

type StreakRow = {
  user_id: string;
  current_streak: number | null;
  last_claim_date: string | null;
};

/** How far back we look when learning a learner's usual active hour. */
const ACTIVITY_LOOKBACK_DAYS = 21;
/** Widen the delivery window so a 30-minute cron still hits the target hour. */
const DELIVERY_WINDOW_MINUTES = 30;
const UPSERT_CHUNK_SIZE = 200;

const STREAK_RISK_PUSH = {
  title: '🔥 Your streak is at risk!',
  body: "You haven't claimed today's streak reward yet — pop in and keep your streak alive!",
  url: '/',
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadReminderUsers(): Promise<{ users: UserRow[]; error?: string }> {
  const users: UserRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid, reminder_settings, reminder_timezone, reminder_last_sent_at')
      .order('uid')
      .range(offset, offset + pageSize - 1);
    if (error) return { users: [], error: error.message };
    const page = (data || []) as unknown as UserRow[];
    users.push(...page);
    if (page.length < pageSize) break;
  }
  return { users };
}

async function loadStreakStates(userIds: string[]): Promise<Map<string, StreakRow>> {
  const map = new Map<string, StreakRow>();
  for (const ids of chunk(userIds, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from('daily_streak_state')
      .select('user_id, current_streak, last_claim_date')
      .in('user_id', ids);
    if (error) break;
    for (const row of (data || []) as StreakRow[]) {
      map.set(String(row.user_id), row);
    }
  }
  return map;
}

/** Recent activity timestamps per user, used to infer their active hour. */
async function loadRecentActivity(userIds: string[], sinceIso: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const push = (userId: string, iso: unknown) => {
    if (!iso) return;
    const list = map.get(userId);
    if (list) list.push(String(iso));
    else map.set(userId, [String(iso)]);
  };

  for (const ids of chunk(userIds, UPSERT_CHUNK_SIZE)) {
    const [gameRes, quizRes] = await Promise.all([
      supabaseAdmin
        .from('game_progress')
        .select('uid, playedat')
        .in('uid', ids)
        .gte('playedat', sinceIso),
      supabaseAdmin
        .from('quiz_attempts')
        .select('user_id, completed_at')
        .in('user_id', ids)
        .gte('completed_at', sinceIso),
    ]);

    for (const row of (gameRes.data || []) as Array<{ uid?: string; playedat?: string }>) {
      if (row.uid) push(String(row.uid), row.playedat);
    }
    for (const row of (quizRes.data || []) as Array<{ user_id?: string; completed_at?: string }>) {
      if (row.user_id) push(String(row.user_id), row.completed_at);
    }
  }

  return map;
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
  const todayKey = now.toISOString().slice(0, 10);

  const { users, error } = await loadReminderUsers();
  if (error) return NextResponse.json({ error }, { status: 500 });

  const playerIdsByUser = await loadAllUserOneSignalPlayerIds();
  const deliverable = users.filter((u) => (playerIdsByUser.get(u.uid)?.length || 0) > 0);

  if (!deliverable.length) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, checked: users.length, deliverable: 0, ranAt: now.toISOString() });
  }

  const deliverableIds = deliverable.map((u) => u.uid);
  const activityCutoff = new Date(now);
  activityCutoff.setUTCDate(activityCutoff.getUTCDate() - ACTIVITY_LOOKBACK_DAYS);

  const [streakStates, activityByUser] = await Promise.all([
    loadStreakStates(deliverableIds),
    loadRecentActivity(deliverableIds, activityCutoff.toISOString()),
  ]);

  let sent = 0;
  let failed = 0;
  const results: Array<{
    uid: string;
    ok: boolean;
    atRiskStreak?: number;
    usedHour?: string;
    recipients?: number;
    error?: string;
  }> = [];

  for (const user of deliverable) {
    const settings = mergeReminderSettings(user.reminder_settings ?? null);
    if (!settings.keepStreak?.enabled) continue;

    const state = streakStates.get(user.uid);
    const currentStreak = Number(state?.current_streak ?? 0);
    if (currentStreak < 1) continue;

    const lastClaimDate = state?.last_claim_date ? String(state.last_claim_date).slice(0, 10) : null;
    if (lastClaimDate === todayKey) continue;

    const playerIds = playerIdsByUser.get(user.uid) || [];
    const lastSent: UserReminderLastSent = user.reminder_last_sent_at || {};
    const timeZone = user.reminder_timezone || 'Europe/London';

    const inferredHour = inferActiveHour(activityByUser.get(user.uid) || [], timeZone);
    const time = inferredHour === null ? settings.keepStreak.time : hourToReminderTime(inferredHour);

    if (!isUserReminderDue({
      now,
      time,
      timeZone,
      lastSentAt: lastSent.keepStreak,
      deliveryWindowMinutes: DELIVERY_WINDOW_MINUTES,
    })) continue;

    const push = await sendUserPush({
      userId: user.uid,
      playerIds,
      title: STREAK_RISK_PUSH.title,
      body: STREAK_RISK_PUSH.body,
      url: STREAK_RISK_PUSH.url,
    });

    if (!push.sent) {
      failed += 1;
      results.push({ uid: user.uid, ok: false, atRiskStreak: currentStreak, usedHour: time, recipients: push.recipients, error: push.reason || undefined });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ reminder_last_sent_at: { ...lastSent, keepStreak: now.toISOString() } })
      .eq('uid', user.uid);

    if (updateError) {
      failed += 1;
      results.push({
        uid: user.uid,
        ok: false,
        atRiskStreak: currentStreak,
        usedHour: time,
        recipients: push.recipients,
        error: `Push was delivered but delivery tracking failed: ${updateError.message}`,
      });
      continue;
    }

    sent += 1;
    results.push({ uid: user.uid, ok: true, atRiskStreak: currentStreak, usedHour: time, recipients: push.recipients });
  }

  return NextResponse.json(
    {
      ok: failed === 0,
      sent,
      failed,
      checked: users.length,
      deliverable: deliverable.length,
      results,
      ranAt: now.toISOString(),
    },
    { status: failed > 0 ? 502 : 200 }
  );
}

export async function POST(request: Request) {
  return GET(request);
}
