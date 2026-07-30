import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createReminderToken } from '@/lib/reminder-token';
import { isOneSignalServerConfigured, sendOneSignalPushMultiApp } from '@/lib/onesignal-server';
import { runDuePushSchedules } from '@/lib/push-schedules';
import { authorizeCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

type ReminderUser = {
  uid: string;
  name: string | null;
  email: string | null;
  parent_email: string | null;
  reminder_opt_in: boolean | null;
  reminder_frequency: 'daily' | '3x_week' | 'weekly' | null;
  reminder_last_sent_at: string | null;
  reminder_unsubscribed_at: string | null;
};

const OPTIONAL_REMINDER_COLUMNS = [
  'parent_email',
  'reminder_frequency',
  'reminder_last_sent_at',
  'reminder_unsubscribed_at',
  'reminder_opt_in',
] as const;

function getMissingColumnFromError(message: string): string | null {
  const m = String(message || '');
  const match = m.match(/Could not find the '([\w_]+)' column|column\s+"?([\w_]+)"?\s+does not exist/i);
  return match?.[1] || match?.[2] || null;
}

async function loadReminderUsers() {
  const activeColumns = new Set<string>([
    'uid',
    'name',
    'email',
    'parent_email',
    'reminder_opt_in',
    'reminder_frequency',
    'reminder_last_sent_at',
    'reminder_unsubscribed_at',
  ]);

  for (let attempt = 0; attempt <= OPTIONAL_REMINDER_COLUMNS.length; attempt += 1) {
    const selectColumns = Array.from(activeColumns).join(',');
    let query = supabaseAdmin.from('users').select(selectColumns).limit(500);
    if (activeColumns.has('reminder_opt_in')) {
      query = query.eq('reminder_opt_in', true);
    }
    if (activeColumns.has('reminder_unsubscribed_at')) {
      query = query.is('reminder_unsubscribed_at', null);
    }

    const { data, error } = await query;
    if (!error) {
      const rows = ((data || []) as unknown as Array<Record<string, unknown>>);
      return {
        users: rows.map((row) => ({
          uid: String(row.uid || ''),
          name: row.name ? String(row.name) : null,
          email: row.email ? String(row.email) : null,
          parent_email: row.parent_email ? String(row.parent_email) : null,
          reminder_opt_in:
            typeof row.reminder_opt_in === 'boolean' ? row.reminder_opt_in : Boolean(row.reminder_opt_in),
          reminder_frequency:
            row.reminder_frequency === 'daily' ||
            row.reminder_frequency === '3x_week' ||
            row.reminder_frequency === 'weekly'
              ? row.reminder_frequency
              : null,
          reminder_last_sent_at: row.reminder_last_sent_at ? String(row.reminder_last_sent_at) : null,
          reminder_unsubscribed_at: row.reminder_unsubscribed_at ? String(row.reminder_unsubscribed_at) : null,
        })) as ReminderUser[],
      };
    }

    const missingColumn = getMissingColumnFromError(error.message);
    if (missingColumn && activeColumns.has(missingColumn)) {
      activeColumns.delete(missingColumn);
      continue;
    }

    return { users: [] as ReminderUser[], error };
  }

  return { users: [] as ReminderUser[] };
}

function getMinDaysBetweenReminders(freq: ReminderUser['reminder_frequency']): number {
  if (freq === 'daily') return 1;
  if (freq === '3x_week') return 2;
  return 7;
}

function shouldSendReminder(user: ReminderUser): boolean {
  if (!user.reminder_opt_in) return false;
  if (user.reminder_unsubscribed_at) return false;
  if (!user.reminder_last_sent_at) return true;

  const lastSent = new Date(user.reminder_last_sent_at);
  const daysSinceLast = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLast >= getMinDaysBetweenReminders(user.reminder_frequency);
}

function looksLikeOneSignalId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function sendPushReminder(userId: string, childName: string, resumeUrl: string) {
  if (!isOneSignalServerConfigured()) return { sent: false, reason: 'not_configured' as const };

  const { data } = await supabaseAdmin
    .from('push_notification_tokens')
    .select('token, provider')
    .eq('user_id', userId)
    .limit(20);

  const playerIds = Array.from(
    new Set(
      (data || [])
        .map((row) => ({
          token: String(row.token || '').trim(),
          provider: row.provider ? String(row.provider) : null,
        }))
        .filter((row) => row.token)
        .filter((row) => !row.provider || row.provider === 'onesignal')
        .map((row) => row.token)
        .filter(looksLikeOneSignalId)
    )
  );

  const result = await sendOneSignalPushMultiApp({
    title: 'Daily Quiz is ready!',
    body: `${childName}, open Kids Zone and keep your learning streak going!`,
    url: resumeUrl,
    playerIds: playerIds.length ? playerIds : undefined,
    externalUserIds: [userId],
    preferBothTargets: true,
  });

  return { sent: result.ok, reason: result.error || null };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Also process admin push schedules (backup when dedicated cron is delayed)
  let scheduledPush: Awaited<ReturnType<typeof runDuePushSchedules>> | null = null;
  try {
    scheduledPush = await runDuePushSchedules();
  } catch (err) {
    console.warn('[cron/send-reminders] scheduled pushes failed:', err);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const canEmail = Boolean(RESEND_API_KEY);
  const canPush = isOneSignalServerConfigured();

  if (!canEmail && !canPush) {
    return NextResponse.json(
      { error: 'Neither RESEND_API_KEY nor ONESIGNAL_REST_API_KEY is configured' },
      { status: 500 }
    );
  }

  try {
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(inactivityCutoff.getDate() - 2);
    const cutoffDate = inactivityCutoff.toISOString().slice(0, 10);

    const { users, error } = await loadReminderUsers();
    if (error) throw error;
    if (!users.length) {
      return NextResponse.json({ success: true, sent: 0, emails: 0, pushes: 0, scanned: 0 });
    }

    const userIds = users.map((u) => u.uid);
    const { data: pointsRows, error: pointsError } = await supabaseAdmin
      .from('users_points')
      .select('user_id,last_earned_date')
      .in('user_id', userIds);

    if (pointsError) throw pointsError;

    const lastEarnedByUser = new Map<string, string | null>();
    for (const row of pointsRows || []) {
      lastEarnedByUser.set(row.user_id as string, (row.last_earned_date as string | null) || null);
    }

    let emails = 0;
    let pushes = 0;
    const failures: Array<{ uid: string; reason: string }> = [];

    for (const user of users) {
      const lastEarnedDate = lastEarnedByUser.get(user.uid);
      if (!lastEarnedDate || lastEarnedDate > cutoffDate) continue;
      if (!shouldSendReminder(user)) continue;

      const childName = (user.name || 'your child').trim();
      const token = createReminderToken(user.uid);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const unsubscribeUrl = `${appUrl}/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`;
      const resumeUrl = `${appUrl}/quiz?reminder=1`;

      let delivered = false;

      if (canPush) {
        const push = await sendPushReminder(user.uid, childName, resumeUrl);
        if (push.sent) {
          pushes += 1;
          delivered = true;
        } else if (push.reason && push.reason !== 'not_configured') {
          failures.push({ uid: user.uid, reason: `push:${push.reason}` });
        }
      }

      const toEmail = user.parent_email || user.email;
      if (canEmail && toEmail) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Islamic Kids Platform <onboarding@resend.dev>',
            to: [toEmail],
            subject: `Kids Zone: ${childName}'s quiz is waiting!`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
              <h2 style="color: #5b21b6;">Assalamu Alaikum!</h2>
              <p style="color: #374151; line-height: 1.6;">
                ${childName} has not visited Kids Zone for a couple of days.
                A quick 5-minute quiz or game can help keep their learning streak going — and they can earn up to 200 points today!
              </p>
              <p style="color: #374151; line-height: 1.6; font-size: 14px;">
                Tip: remind them to try the daily quiz first — it is the fastest way to earn points.
              </p>
              <p style="margin: 24px 0;">
                <a href="${resumeUrl}" style="background: #5b21b6; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">Start Today's Quiz</a>
              </p>
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                You are receiving this because reminders are enabled in your account settings.
                If you prefer not to receive reminder emails, unsubscribe here:
                <a href="${unsubscribeUrl}">Unsubscribe</a>
              </p>
            </div>
          `,
          }),
        });

        if (response.ok) {
          emails += 1;
          delivered = true;
        } else {
          const reason = await response.text();
          failures.push({ uid: user.uid, reason: `email:${reason}` });
        }
      }

      if (delivered) {
        const updateResult = await supabaseAdmin
          .from('users')
          .update({ reminder_last_sent_at: new Date().toISOString() })
          .eq('uid', user.uid);
        if (updateResult.error && !/reminder_last_sent_at|schema cache|does not exist/i.test(updateResult.error.message)) {
          throw updateResult.error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanned: users.length,
      sent: emails + pushes,
      emails,
      pushes,
      failures,
      scheduledPushes: scheduledPush,
    });
  } catch (error: any) {
    console.error('send-reminders cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
