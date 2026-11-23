import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isAdminSessionRequest } from '@/lib/admin-session';

// GET  /api/admin/send-email  -> list every signup email (recipients for the admin mailer)
// POST /api/admin/send-email  -> send an email to all signups or a chosen set
//
// The recipient list comes from Supabase Auth (auth.users), which is the
// authoritative record of every signup. The public `users` table is only a
// partial mirror, so it is used just to add display names.
//
// Sending prefers the Gmail account configured with EMAIL_USER / EMAIL_PASS
// (so mail appears to come from that inbox) and falls back to Resend.
//
// POST body:
// {
//   "userIds": ["uid1", "uid2"],   // send to specific users (Supabase auth ids)
//   "allUsers": true,              // send to every signup
//   "subject": "Email Subject",
//   "html": "<p>Email content</p>",// HTML content
//   "text": "Email content",       // plain text (used when html is absent)
//   "replyTo": "support@..."       // optional reply-to
// }

export const dynamic = 'force-dynamic';

const FROM_NAME = 'Kids Zone';
const RESEND_FROM_FALLBACK = 'Kids Zone <onboarding@resend.dev>';
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 20;

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
  if (email.endsWith('@example.com')) return '';
  if (email.startsWith('user-') && /@local$/i.test(email)) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

type Recipient = { uid: string; name: string; email: string; createdAt: string | null };

/**
 * Every signup, straight from Supabase Auth. Names are enriched from the
 * public `users` table when available, otherwise derived from user metadata.
 */
async function listAllSignups(): Promise<Recipient[]> {
  const byUid = new Map<string, { email: string; createdAt: string | null; metaName: string }>();

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });
    if (error) throw error;

    const users = data?.users || [];
    for (const authUser of users) {
      const email = sanitizeRecipient(authUser.email);
      if (!email) continue;
      const meta = (authUser.user_metadata as Record<string, unknown>) || {};
      byUid.set(authUser.id, {
        email,
        createdAt: authUser.created_at || null,
        metaName: String(meta.name || meta.full_name || meta.fullName || '').trim(),
      });
    }

    if (users.length < AUTH_PAGE_SIZE) break;
  }

  // Prefer a real display name from the users table when one exists.
  const nameByUid = new Map<string, string>();
  if (byUid.size > 0) {
    const { data: rows } = await supabaseAdmin.from('users').select('uid, name');
    for (const row of rows || []) {
      const uid = String((row as any).uid || '');
      const name = String((row as any).name || '').trim();
      if (uid && name && !/^learner\b/i.test(name)) nameByUid.set(uid, name);
    }
  }

  const recipients: Recipient[] = [];
  const seenEmails = new Set<string>();

  for (const [uid, info] of byUid) {
    if (seenEmails.has(info.email)) continue;
    seenEmails.add(info.email);
    recipients.push({
      uid,
      name: nameByUid.get(uid) || info.metaName || info.email.split('@')[0],
      email: info.email,
      createdAt: info.createdAt,
    });
  }

  recipients.sort((a, b) => {
    const aMs = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bMs = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bMs - aMs;
  });

  return recipients;
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
    const recipients = await listAllSignups();

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
      source: 'supabase-auth',
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

    const all = await listAllSignups();

    let targets: Recipient[];
    if (allUsers === true) {
      targets = all;
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const wanted = new Set(userIds.map((id: unknown) => String(id)));
      targets = all.filter((r) => wanted.has(r.uid));
    } else {
      return NextResponse.json({ error: 'userIds array or allUsers flag is required' }, { status: 400 });
    }

    const recipients = [...new Set(targets.map((r) => r.email))];

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
