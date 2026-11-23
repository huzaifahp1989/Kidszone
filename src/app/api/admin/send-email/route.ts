import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isAdminSessionRequest } from '@/lib/admin-session';

// GET  /api/admin/send-email  -> list every signup email (recipients for the admin mailer)
// POST /api/admin/send-email  -> send an email to all signups or a chosen set
//
// Sending prefers the Gmail account configured with EMAIL_USER / EMAIL_PASS
// (so mail appears to come from that inbox) and falls back to Resend.
//
// POST body:
// {
//   "userIds": ["uid1", "uid2"],   // send to specific users
//   "allUsers": true,              // send to every signup
//   "subject": "Email Subject",
//   "html": "<p>Email content</p>",// HTML content
//   "text": "Email content",       // plain text (used when html is absent)
//   "replyTo": "support@..."       // optional reply-to
// }

export const dynamic = 'force-dynamic';

const FROM_NAME = 'Kids Zone';
const RESEND_FROM_FALLBACK = 'Kids Zone <onboarding@resend.dev>';

function isAuthorized(request: Request): boolean {
  return isAdminRequest(request) || isAdminSessionRequest(request);
}

function getGmailCredentials(): { user: string; pass: string } | null {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) return null;
  return { user, pass };
}

function getFromAddress(): string {
  const configured = (
    process.env.EMAIL_FROM ||
    process.env.CHAT_EMAIL_FROM ||
    process.env.RESEND_FROM ||
    ''
  ).trim();
  if (configured) return configured;

  const gmail = getGmailCredentials();
  if (gmail) return `${FROM_NAME} <${gmail.user}>`;
  return RESEND_FROM_FALLBACK;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text: string): string {
  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #334155;">${escapeHtml(
    text
  ).replace(/\n/g, '<br />')}</div>`;
}

function sanitizeRecipient(value: unknown): string {
  const email = String(value || '').trim().toLowerCase();
  if (!email.includes('@')) return '';
  if (email.endsWith('@local')) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

type MailJob = {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

type MailResult = { ok: boolean; sent: number; errors: string[] };

async function sendViaGmail(job: MailJob): Promise<MailResult> {
  const gmail = getGmailCredentials();
  if (!gmail) {
    return { ok: false, sent: 0, errors: ['Gmail not configured (set EMAIL_USER and EMAIL_PASS)'] };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmail.user, pass: gmail.pass },
  });

  let sent = 0;
  const errors: string[] = [];
  for (const to of job.to) {
    try {
      await transporter.sendMail({
        from: getFromAddress(),
        to,
        subject: job.subject,
        ...(job.html ? { html: job.html } : {}),
        ...(job.text ? { text: job.text } : {}),
        ...(job.replyTo ? { replyTo: job.replyTo } : {}),
      });
      sent += 1;
    } catch (err) {
      errors.push(`${to}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  return { ok: sent > 0, sent, errors };
}

async function sendViaResend(job: MailJob): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, sent: 0, errors: ['No email transport configured (set EMAIL_USER/EMAIL_PASS or RESEND_API_KEY)'] };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const to of job.to) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: getFromAddress(),
          to,
          subject: job.subject,
          ...(job.html ? { html: job.html } : {}),
          ...(job.text && !job.html ? { text: job.text } : {}),
          ...(job.replyTo ? { reply_to: job.replyTo } : {}),
        }),
      });
      if (response.ok) {
        sent += 1;
      } else {
        errors.push(`${to}: ${await response.text()}`);
      }
    } catch (err) {
      errors.push(`${to}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  return { ok: sent > 0, sent, errors };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid, name, email, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const seen = new Set<string>();
    const recipients: { uid: string; name: string; email: string; createdAt: string | null }[] = [];

    for (const row of data || []) {
      const email = sanitizeRecipient((row as any).email);
      if (!email || seen.has(email)) continue;
      seen.add(email);
      recipients.push({
        uid: String((row as any).uid || ''),
        name: String((row as any).name || '').trim() || email.split('@')[0],
        email,
        createdAt: (row as any).created_at || null,
      });
    }

    const transport = getGmailCredentials()
      ? 'gmail'
      : process.env.RESEND_API_KEY
        ? 'resend'
        : 'none';

    return NextResponse.json({
      recipients,
      total: recipients.length,
      sender: getFromAddress(),
      transport,
    });
  } catch (error: any) {
    console.error('[send-email] GET', error);
    return NextResponse.json({ error: error?.message || 'Failed to load recipients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userIds, allUsers, subject, html, text, replyTo } = body;

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    const safeHtml = typeof html === 'string' ? html.trim() : '';
    const safeText = typeof text === 'string' ? text.trim() : '';
    if (!safeHtml && !safeText) {
      return NextResponse.json({ error: 'html or text content is required' }, { status: 400 });
    }

    let recipients: string[] = [];

    if (allUsers === true) {
      const { data, error } = await supabaseAdmin.from('users').select('email');
      if (error) throw error;
      recipients = (data || []).map((u: any) => sanitizeRecipient(u.email));
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .in('uid', userIds);
      if (error) throw error;
      recipients = (data || []).map((u: any) => sanitizeRecipient(u.email));
    } else {
      return NextResponse.json({ error: 'userIds array or allUsers flag is required' }, { status: 400 });
    }

    recipients = [...new Set(recipients.filter(Boolean))];

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 404 });
    }

    const job: MailJob = {
      to: recipients,
      subject: subject.trim(),
      ...(safeHtml ? { html: safeHtml } : { html: textToHtml(safeText) }),
      ...(typeof replyTo === 'string' && replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
    };

    const usingGmail = Boolean(getGmailCredentials());
    const result = usingGmail ? await sendViaGmail(job) : await sendViaResend(job);

    if (!result.ok) {
      return NextResponse.json(
        { error: `Failed to send to any recipients: ${result.errors.join('; ')}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      recipientCount: recipients.length,
      transport: usingGmail ? 'gmail' : 'resend',
      message: `Sent ${result.sent} of ${recipients.length} email(s)`,
      ...(result.errors.length > 0 ? { warning: `Failed for: ${result.errors.join('; ')}` } : {}),
    });
  } catch (error: any) {
    console.error('[send-email]', error);
    return NextResponse.json({ error: error?.message || 'Failed to send emails' }, { status: 500 });
  }
}
