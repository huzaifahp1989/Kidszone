import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { QUIZ_POINTS_PER_COMPLETION } from '@/lib/points-policy';
import { getKidLevelTitle } from '@/lib/level-names';

// POST /api/admin/send-reminder
// Body: { userId: string } — sends a personalised progress email to that user.
// Body: { all: true }     — sends to all users who have an email address.

const FROM_ADDRESS = 'Kids Zone <onboarding@resend.dev>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://islamic-kids-platform.vercel.app';

function buildEmailHtml(name: string, points: number, weeklyPoints: number, level: string | number, streak: number) {
  const levelLabel = getKidLevelTitle(level);
  const motivational = getMotivationalMessage(points, weeklyPoints, streak);
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#0f766e 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:48px;line-height:1;">🌙</div>
              <h1 style="color:#ffffff;margin:12px 0 6px;font-size:26px;font-weight:700;">Kids Zone</h1>
              <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Islamic Learning Platform</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 32px 0;">
              <p style="font-size:18px;color:#134e4a;font-weight:700;margin:0 0 8px;">Assalamu Alaikum, ${escapeHtml(name)}! 👋</p>
              <p style="font-size:15px;color:#475569;margin:0 0 24px;line-height:1.6;">
                Your quiz is waiting! Here is a quick look at how you are doing on Kids Zone.
              </p>
            </td>
          </tr>

          <!-- Stats Row -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#f0fdfa;border-radius:14px;padding:16px;text-align:center;border:1px solid rgba(20,184,166,0.2);">
                      <div style="font-size:28px;font-weight:800;color:#0f766e;">${points.toLocaleString()}</div>
                      <div style="font-size:12px;color:#115e59;margin-top:4px;">⭐ Total Points</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#fffbeb;border-radius:14px;padding:16px;text-align:center;border:1px solid rgba(245,158,11,0.2);">
                      <div style="font-size:28px;font-weight:800;color:#d97706;">${weeklyPoints.toLocaleString()}</div>
                      <div style="font-size:12px;color:#b45309;margin-top:4px;">📅 This Week</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <div style="background:#eef2ff;border-radius:14px;padding:16px;text-align:center;border:1px solid rgba(99,102,241,0.2);">
                      <div style="font-size:28px;font-weight:800;color:#0f766e;">${streak}</div>
                      <div style="font-size:12px;color:#115e59;margin-top:4px;">🔥 Day Streak</div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="background:#ccfbf1;border-radius:14px;padding:14px;margin-top:8px;text-align:center;border:1px solid rgba(229,201,163,0.3);">
                <span style="font-size:13px;color:#134e4a;">🏅 Current Level: <strong>${escapeHtml(String(levelLabel))}</strong></span>
              </div>
            </td>
          </tr>

          <!-- Motivational Message -->
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background:linear-gradient(135deg,#134e4a 0%,#0d9488 100%);border-radius:16px;padding:24px;color:#ffffff;">
                <p style="font-size:18px;font-weight:700;margin:0 0 10px;">💬 A Message For You</p>
                <p style="font-size:14px;line-height:1.7;margin:0;color:rgba(255,255,255,0.9);">${motivational}</p>
              </div>
            </td>
          </tr>

          <!-- What to do next -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="font-size:16px;font-weight:700;color:#134e4a;margin:0 0 14px;">Continue Your Journey</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px;">
                    <a href="${SITE_URL}/quiz" style="display:block;background:#f0fdfa;border:1px solid rgba(20,184,166,0.25);border-radius:12px;padding:14px 16px;text-decoration:none;">
                      <span style="font-size:20px;">🧠</span>
                      <span style="display:inline-block;margin-left:10px;font-size:14px;font-weight:700;color:#0f766e;vertical-align:middle;">Take Today&apos;s Quiz</span>
                      <span style="float:right;font-size:12px;color:#115e59;font-weight:600;line-height:2;">+${QUIZ_POINTS_PER_COMPLETION} pts</span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px;">
                    <a href="${SITE_URL}/pledge" style="display:block;background:#fff5f5;border:1px solid rgba(255,107,107,0.25);border-radius:12px;padding:14px 16px;text-decoration:none;">
                      <span style="font-size:20px;">📿</span>
                      <span style="display:inline-block;margin-left:10px;font-size:14px;font-weight:700;color:#dc2626;vertical-align:middle;">Pledge Durood &amp; Zikr</span>
                      <span style="float:right;font-size:12px;color:#dc2626;font-weight:600;line-height:2;">Bonus pts</span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px;">
                    <a href="${SITE_URL}/tasks" style="display:block;background:#eef2ff;border:1px solid rgba(99,102,241,0.25);border-radius:12px;padding:14px 16px;text-decoration:none;">
                      <span style="font-size:20px;">📝</span>
                      <span style="display:inline-block;margin-left:10px;font-size:14px;font-weight:700;color:#0f766e;vertical-align:middle;">Invite a Friend</span>
                      <span style="float:right;font-size:12px;color:#115e59;font-weight:600;line-height:2;">+50 pts</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#0f766e);color:#ffffff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px rgba(13,148,136,0.4);">
                Continue Learning →
              </a>
              <p style="font-size:12px;color:#475569;margin:20px 0 0;">
                New winner announced 1 May 2026 — take part at least 3 times a week to enter the draw!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#ccfbf1;padding:20px 32px;text-align:center;border-top:1px solid rgba(229,201,163,0.4);">
              <p style="font-size:12px;color:#475569;margin:0;">© 2026 Kids Zone — Islam Media Central</p>
              <p style="font-size:11px;color:#c4956a;margin:6px 0 0;">This is an automated progress reminder. Keep learning!</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMotivationalMessage(points: number, weeklyPoints: number, streak: number): string {
  if (streak >= 7) {
    return `Wow — ${streak} days in a row! You are a Streak Master. Keep going and try a prophet story quiz or a game today!`;
  }
  if (weeklyPoints >= 100) {
    return `You earned ${weeklyPoints} points this week — amazing! Can you finish today's quiz and get closer to 200 daily points?`;
  }
  if (points >= 500) {
    return `You have ${points.toLocaleString()} points — you are a Young Scholar! Play a game or log salah to keep your streak alive.`;
  }
  if (points > 0) {
    return `Every quiz and game helps you learn. You still have activities left today — try the daily quiz for +${QUIZ_POINTS_PER_COMPLETION} points!`;
  }
  return `Your learning adventure starts with one quiz! Sign in, take today's quiz, and start earning points. Little steps every day make a big difference!`;
}

export async function POST(req: Request) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured on the server.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { userId, all } = body || {};

    // Build the list of recipients
    type UserRow = { uid: string; name: string | null; email: string | null; points: number; weeklypoints: number; streak?: number; level?: string };
    let recipients: UserRow[] = [];

    if (all) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('uid, name, email, points, weeklypoints');
      if (error) throw error;
      recipients = (data || []).filter((u: any) => u.email && !u.email.endsWith('@local'));
    } else {
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('uid, name, email, points, weeklypoints')
        .eq('uid', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.email) {
        return NextResponse.json({ error: 'User not found or has no email address.' }, { status: 404 });
      }
      if (data.email.endsWith('@local')) {
        return NextResponse.json({ error: 'This user does not have a real email address.' }, { status: 400 });
      }
      recipients = [data];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No users with valid email addresses found.' }, { status: 400 });
    }

    // Fetch streak/level from users_points for each recipient
    const uids = recipients.map((u) => u.uid);
    const { data: pointRows } = await supabaseAdmin
      .from('users_points')
      .select('user_id, level, today_points')
      .in('user_id', uids);

    const pointMap: Record<string, { level: string; streak: number }> = {};
    for (const row of pointRows || []) {
      pointMap[row.user_id] = { level: String(row.level || 1), streak: 0 };
    }

    // Fetch streaks via quiz_attempts count in last 7 days as a proxy
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select('user_id')
      .in('user_id', uids)
      .gte('completed_at', sevenDaysAgo);

    const streakMap: Record<string, number> = {};
    for (const row of recentAttempts || []) {
      streakMap[row.user_id] = (streakMap[row.user_id] || 0) + 1;
    }

    // Send emails
    let sent = 0;
    const errors: string[] = [];

    for (const user of recipients) {
      const name = user.name || 'Friend';
      const points = user.points || 0;
      const weeklyPoints = user.weeklypoints || 0;
      const level = pointMap[user.uid]?.level || '1';
      const streak = streakMap[user.uid] || 0;

      const html = buildEmailHtml(name, points, weeklyPoints, level, streak);

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [user.email!],
            subject: `${name}, your quiz is waiting on Kids Zone! 📚`,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`${user.email}: ${errText}`);
        } else {
          sent++;
        }
      } catch (err: any) {
        errors.push(`${user.email}: ${err?.message || 'send failed'}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sent} of ${recipients.length} reminder email${recipients.length !== 1 ? 's' : ''}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
