import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isAdminSessionRequest } from '@/lib/admin-session';
import { getAppUrl } from '@/lib/app-url';

// GET  /api/admin/send-email  -> list every signup email (recipients for the admin mailer)
// POST /api/admin/send-email  -> send an email to all signups, one audience, or a chosen set
//
// The recipient list comes from Supabase Auth (auth.users), which is the
// authoritative record of every signup. The public `users` table is only a
// partial mirror, so it is used just to add display names.
//
// Signups are split into two audiences using the metadata fields written by
// each signup form. Kids Zone signups carry the Kids Zone form fields; signups
// from the other apps on this project carry a different field set. The two sets
// do not overlap, so the split is unambiguous.
//
// Sending prefers the Gmail account configured with EMAIL_USER / EMAIL_PASS
// (so mail appears to come from that inbox) and falls back to Resend. The
// display name is configurable: Islam Media Central (default) or Kids Zone.
//
// POST body:
// {
//   "userIds": ["uid1", "uid2"],   // send to specific users (Supabase auth ids)
//   "allUsers": true,              // send to every signup
//   "audience": "kids" | "other", // or send to one audience (alternative to allUsers)
//   "fromName": "kids",           // "central" (default) | "kids"
//   "subject": "Email Subject",
//   "html": "<p>Email content</p>",// HTML content
//   "text": "Email content",       // plain text (used when html is absent)
//   "replyTo": "support@..."       // optional reply-to
// }
//
// Response: { sent, recipientCount, failed: [{ email, error }], sendId, ... }.
// Any recipient in `failed` was NOT delivered. A per-recipient 1x1 pixel is
// appended to the HTML (see /api/track/open) and each send is recorded in
// `email_sends` so opens can be counted for the admin dashboard.

export const dynamic = 'force-dynamic';

const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 20;

/** Display names a broadcast can be sent as. */
const SEND_AS = {
  central: 'Islam Media Central',
  kids: 'Kids Zone',
} as const;

/**
 * Metadata fields written by the Kids Zone signup form. Signups created by the
 * other apps on this Supabase project never set these, so their presence marks
 * a Kids Zone signup.
 */
const KIDS_ZONE_FIELDS = ['family_email', 'madrasahName', 'needsSignupForm', 'age', 'contactNumber'];

type Audience = 'kids' | 'other';

function isAuthorized(request: Request): boolean {
  return isAdminRequest(request) || isAdminSessionRequest(request);
}

function getGmailCredentials(): { user: string; pass: string } | null {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) return null;
  return { user, pass };
}

function resolveFromName(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'kids' || raw === 'kids zone') return SEND_AS.kids;
  return SEND_AS.central;
}

/** Builds the From header: the chosen display name plus the real sending address. */
function getFromAddress(fromName: string): string {
  const gmail = getGmailCredentials();
  if (gmail) return `${fromName} <${gmail.user}>`;

  const configured = (
    process.env.EMAIL_FROM ||
    process.env.CHAT_EMAIL_FROM ||
    process.env.RESEND_FROM ||
    ''
  ).trim();
  if (configured) {
    const match = configured.match(/<([^>]+)>/);
    return `${fromName} <${match ? match[1] : configured}>`;
  }
  return `${fromName} <onboarding@resend.dev>`;
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

type Recipient = {
  uid: string;
  name: string;
  email: string;
  createdAt: string | null;
  audience: Audience;
};

/**
 * Every signup, straight from Supabase Auth. Names are enriched from the
 * public `users` table when available, otherwise derived from user metadata.
 */
async function listAllSignups(): Promise<Recipient[]> {
  const byUid = new Map<
    string,
    { email: string; createdAt: string | null; metaName: string; audience: Audience }
  >();

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
      const isKidsZone = KIDS_ZONE_FIELDS.some((field) => meta[field] !== undefined);

      byUid.set(authUser.id, {
        email,
        createdAt: authUser.created_at || null,
        metaName: String(meta.name || meta.full_name || meta.fullName || '').trim(),
        audience: isKidsZone ? 'kids' : 'other',
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
      audience: info.audience,
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
  fromName: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** When present, a per-recipient open-tracking pixel is appended to the HTML. */
  track?: { sendId: string; appUrl: string };
};

/** A single recipient that could not be delivered to. */
type MailFailure = { email: string; error: string };

type MailResult = { ok: boolean; sent: number; failed: MailFailure[] };

/**
 * Appends a 1x1 tracking pixel unique to this send + recipient so opens can be
 * counted. Falls back to appending at the end if there is no </body> tag.
 */
function withTrackingPixel(html: string, sendId: string, recipient: string, appUrl: string): string {
  const src = `${appUrl}/api/track/open?s=${encodeURIComponent(sendId)}&e=${encodeURIComponent(recipient)}`;
  const img = `<img src="${src}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;opacity:0;" />`;
  return html.includes('</body>') ? html.replace('</body>', `${img}</body>`) : html + img;
}

async function sendViaGmail(job: MailJob): Promise<MailResult> {
  const gmail = getGmailCredentials();
  if (!gmail) {
    return {
      ok: false,
      sent: 0,
      failed: job.to.map((email) => ({ email, error: 'Gmail not configured (set EMAIL_USER and EMAIL_PASS)' })),
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmail.user, pass: gmail.pass },
  });

  const from = getFromAddress(job.fromName);
  let sent = 0;
  const failed: MailFailure[] = [];
  for (const to of job.to) {
    try {
      const html =
        job.html && job.track
          ? withTrackingPixel(job.html, job.track.sendId, to, job.track.appUrl)
          : job.html;
      await transporter.sendMail({
        from,
        to,
        subject: job.subject,
        ...(html ? { html } : {}),
        ...(job.text ? { text: job.text } : {}),
        ...(job.replyTo ? { replyTo: job.replyTo } : {}),
      });
      sent += 1;
    } catch (err) {
      failed.push({ email: to, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
  return { ok: sent > 0, sent, failed };
}

async function sendViaResend(job: MailJob): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const message = 'No email transport configured (set EMAIL_USER/EMAIL_PASS or RESEND_API_KEY)';
    return { ok: false, sent: 0, failed: job.to.map((email) => ({ email, error: message })) };
  }

  const from = getFromAddress(job.fromName);
  let sent = 0;
  const failed: MailFailure[] = [];
  for (const to of job.to) {
    try {
      const html =
        job.html && job.track
          ? withTrackingPixel(job.html, job.track.sendId, to, job.track.appUrl)
          : job.html;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to,
          subject: job.subject,
          ...(html ? { html } : {}),
          ...(job.text && !html ? { text: job.text } : {}),
          ...(job.replyTo ? { reply_to: job.replyTo } : {}),
        }),
      });
      if (response.ok) {
        sent += 1;
      } else {
        failed.push({ email: to, error: await response.text() });
      }
    } catch (err) {
      failed.push({ email: to, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
  return { ok: sent > 0, sent, failed };
}

/**
 * Records a broadcast so opens can be reported against it. Best effort: a
 * missing table (migration not applied) or a write error never fails the send.
 */
async function recordSend(entry: {
  id: string;
  subject: string;
  fromName: string;
  audience: string;
  transport: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('email_sends').insert({
    id: entry.id,
    subject: entry.subject,
    from_name: entry.fromName,
    audience: entry.audience,
    transport: entry.transport,
    recipient_count: entry.recipientCount,
    sent_count: entry.sentCount,
    failed_count: entry.failedCount,
  });
  if (error) console.error('[send-email] could not record send:', error.message);
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
      counts: {
        all: recipients.length,
        kids: recipients.filter((r) => r.audience === 'kids').length,
        other: recipients.filter((r) => r.audience === 'other').length,
      },
      defaultFromName: SEND_AS.central,
      sendAsOptions: [
        { key: 'central', label: SEND_AS.central },
        { key: 'kids', label: SEND_AS.kids },
      ],
      sender: getFromAddress(SEND_AS.central),
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
    const { userIds, allUsers, audience, fromName, subject, html, text, replyTo } = body;

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
    let audienceLabel: string;
    if (audience === 'kids' || audience === 'other') {
      targets = all.filter((r) => r.audience === audience);
      audienceLabel = audience === 'kids' ? 'Kids Zone' : 'Islam Media Central';
    } else if (allUsers === true || audience === 'all') {
      targets = all;
      audienceLabel = 'all signups';
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const wanted = new Set(userIds.map((id: unknown) => String(id)));
      targets = all.filter((r) => wanted.has(r.uid));
      audienceLabel = 'selected recipients';
    } else {
      return NextResponse.json(
        { error: 'audience, allUsers flag, or userIds array is required' },
        { status: 400 }
      );
    }

    const recipients = [...new Set(targets.map((r) => r.email))];

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 404 });
    }

    const resolvedFromName = resolveFromName(fromName);

    const sendId = randomUUID();
    const transport = getGmailCredentials() ? 'gmail' : 'resend';

    const job: MailJob = {
      to: recipients,
      fromName: resolvedFromName,
      subject: subject.trim(),
      ...(safeHtml ? { html: safeHtml } : { html: textToHtml(safeText) }),
      ...(typeof replyTo === 'string' && replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
      track: { sendId, appUrl: getAppUrl() },
    };

    const usingGmail = transport === 'gmail';
    const result = usingGmail ? await sendViaGmail(job) : await sendViaResend(job);

    // Record the broadcast (best effort) so opens can be reported against it.
    await recordSend({
      id: sendId,
      subject: subject.trim(),
      fromName: resolvedFromName,
      audience: audienceLabel,
      transport,
      recipientCount: recipients.length,
      sentCount: result.sent,
      failedCount: result.failed.length,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Failed to send to any recipients`,
          failed: result.failed,
          sendId,
        },
        { status: 500 }
      );
    }

    const failedEmails = result.failed.map((f) => f.email);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      recipientCount: recipients.length,
      audience: audienceLabel,
      fromName: resolvedFromName,
      transport,
      sendId,
      failed: result.failed,
      message: `Sent ${result.sent} of ${recipients.length} email(s) to ${audienceLabel} as ${resolvedFromName}`,
      ...(failedEmails.length > 0 ? { warning: `Not sent to: ${failedEmails.join(', ')}` } : {}),
    });
  } catch (error: any) {
    console.error('[send-email]', error);
    return NextResponse.json({ error: error?.message || 'Failed to send emails' }, { status: 500 });
  }
}
