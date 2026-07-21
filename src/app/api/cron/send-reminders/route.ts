import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createReminderToken } from '@/lib/reminder-token';
import { isOneSignalServerConfigured, sendOneSignalPush } from '@/lib/onesignal-server';
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

async function sendPushReminder(userId: string, childName: string, resumeUrl: string) {
  if (!isOneSignalServerConfigured()) return { sent: false, reason: 'not_configured' as const };

  const { data } = await supabaseAdmin
    .from('push_notification_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('provider', 'onesignal')
    .limit(20);

  const playerIds = Array.from(
    new Set((data || []).map((row) => String(row.token || '').trim()).filter(Boolean))
  );

  const result = await sendOneSignalPush({
    title: 'Daily Quiz is ready!',
    body: `${childName}, open Kids Zone and keep your learning streak going!`,
    url: resumeUrl,
    playerIds: playerIds.length ? playerIds : undefined,
    externalUserIds: playerIds.length ? undefined : [userId],
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

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(
        'uid,name,email,parent_email,reminder_opt_in,reminder_frequency,reminder_last_sent_at,reminder_unsubscribed_at'
      )
      .eq('reminder_opt_in', true)
      .is('reminder_unsubscribed_at', null)
      .limit(500);

    if (error) throw error;

    const users = (data || []) as ReminderUser[];
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
              <h2 style="color: #115e59;">Assalamu Alaikum!</h2>
              <p style="color: #374151; line-height: 1.6;">
                ${childName} has not visited Kids Zone for a couple of days.
                A quick 5-minute quiz or game can help keep their learning streak going — and they can earn up to 200 points today!
              </p>
              <p style="color: #374151; line-height: 1.6; font-size: 14px;">
                Tip: remind them to try the daily quiz first — it is the fastest way to earn points.
              </p>
              <p style="margin: 24px 0;">
                <a href="${resumeUrl}" style="background: #115e59; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">Start Today's Quiz</a>
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
        await supabaseAdmin
          .from('users')
          .update({ reminder_last_sent_at: new Date().toISOString() })
          .eq('uid', user.uid);
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
