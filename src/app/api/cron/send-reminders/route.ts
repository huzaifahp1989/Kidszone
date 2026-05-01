import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createReminderToken } from '@/lib/reminder-token';

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
  const targetEmail = user.parent_email || user.email;
  if (!targetEmail) return false;

  if (!user.reminder_last_sent_at) return true;

  const lastSent = new Date(user.reminder_last_sent_at);
  const daysSinceLast = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLast >= getMinDaysBetweenReminders(user.reminder_frequency);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 });
  }

  try {
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(inactivityCutoff.getDate() - 2);
    const cutoffDate = inactivityCutoff.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid,name,email,parent_email,reminder_opt_in,reminder_frequency,reminder_last_sent_at,reminder_unsubscribed_at')
      .eq('reminder_opt_in', true)
      .is('reminder_unsubscribed_at', null)
      .limit(500);

    if (error) throw error;

    const users = (data || []) as ReminderUser[];
    if (!users.length) {
      return NextResponse.json({ success: true, sent: 0, scanned: 0 });
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

    let sent = 0;
    const failures: Array<{ uid: string; reason: string }> = [];

    for (const user of users) {
      const lastEarnedDate = lastEarnedByUser.get(user.uid);
      if (!lastEarnedDate || lastEarnedDate > cutoffDate) continue;
      if (!shouldSendReminder(user)) continue;

      const toEmail = user.parent_email || user.email;
      if (!toEmail) continue;

      const childName = (user.name || 'your child').trim();
      const token = createReminderToken(user.uid);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const unsubscribeUrl = `${appUrl}/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`;
      const resumeUrl = `${appUrl}/quiz`;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Islamic Kids Platform <onboarding@resend.dev>',
          to: [toEmail],
          subject: `Kids Zone reminder for ${childName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
              <h2 style="color: #0f766e;">Assalamu Alaikum</h2>
              <p style="color: #374151; line-height: 1.6;">
                ${childName} has not been active on Kids Zone for a couple of days.
                A quick 5-minute session can help keep their Islamic learning habit strong.
              </p>
              <p style="margin: 24px 0;">
                <a href="${resumeUrl}" style="background: #0f766e; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">Resume Learning</a>
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

      if (!response.ok) {
        const reason = await response.text();
        failures.push({ uid: user.uid, reason });
        continue;
      }

      await supabaseAdmin
        .from('users')
        .update({ reminder_last_sent_at: new Date().toISOString() })
        .eq('uid', user.uid);

      sent += 1;
    }

    return NextResponse.json({
      success: true,
      scanned: users.length,
      sent,
      failures,
    });
  } catch (error: any) {
    console.error('send-reminders cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
