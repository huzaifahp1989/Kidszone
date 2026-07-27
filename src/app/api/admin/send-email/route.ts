import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST /api/admin/send-email
// Send emails to one or more users
//
// Body options:
// {
//   "userIds": ["uid1", "uid2"],          // Send to specific users
//   "allUsers": true,                      // Send to all users with email
//   "subject": "Email Subject",
//   "html": "<p>Email content</p>",       // HTML content
//   "text": "Email content",               // Plain text (fallback if no html)
//   "replyTo": "support@example.com"      // Optional reply-to address
// }

const FROM_ADDRESS = process.env.CHAT_EMAIL_FROM || process.env.RESEND_FROM || 'Kids Zone <onboarding@resend.dev>';

async function sendViaResend(payload: {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string; sent?: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  let successCount = 0;
  const errors: string[] = [];

  for (const email of payload.to) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: email,
          subject: payload.subject,
          ...(payload.html ? { html: payload.html } : {}),
          ...(payload.text && !payload.html ? { text: payload.text } : {}),
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        successCount++;
      } else {
        const errorText = await response.text();
        errors.push(`${email}: ${errorText}`);
      }
    } catch (err) {
      errors.push(`${email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  if (successCount === 0) {
    return { ok: false, error: `Failed to send to any recipients: ${errors.join('; ')}` };
  }

  return { ok: true, sent: successCount, ...(errors.length > 0 ? { error: `Partial failure: ${errors.join('; ')}` } : {}) };
}

export async function POST(req: Request) {
  // Check admin auth
  const adminAuth = req.headers.get('x-admin-auth');
  if (adminAuth !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userIds, allUsers, subject, html, text, replyTo } = body;

    // Validate subject
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    // Validate content
    if ((!html || !html.trim()) && (!text || !text.trim())) {
      return NextResponse.json({ error: 'html or text content is required' }, { status: 400 });
    }

    // Get recipient list
    let recipients: string[] = [];

    if (allUsers === true) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .not('email', 'is', null);

      if (error) throw error;
      recipients = (data || [])
        .map((u: any) => u.email)
        .filter((e: string) => e && e.includes('@') && !e.endsWith('@local'));
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .in('uid', userIds);

      if (error) throw error;
      recipients = (data || [])
        .map((u: any) => u.email)
        .filter((e: string) => e && e.includes('@'));
    } else {
      return NextResponse.json({ error: 'userIds array or allUsers flag is required' }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 404 });
    }

    // Send emails
    const result = await sendViaResend({
      to: recipients,
      subject,
      html: html?.trim(),
      text: text?.trim(),
      replyTo: replyTo?.trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      recipientCount: recipients.length,
      message: `Sent ${result.sent} email(s) successfully`,
      ...(result.error ? { warning: result.error } : {}),
    });
  } catch (error: any) {
    console.error('[send-email]', error);
    return NextResponse.json({ error: error?.message || 'Failed to send emails' }, { status: 500 });
  }
}
