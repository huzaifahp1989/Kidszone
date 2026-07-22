const DEFAULT_FROM = 'Kids Zone <onboarding@resend.dev>';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app';
}

const PRIMARY_CHAT_ADMIN_EMAIL = 'huzaify786@gmail.com';

function getAdminEmails(): string[] {
  const raw =
    process.env.CHAT_ADMIN_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    PRIMARY_CHAT_ADMIN_EMAIL;
  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));

  if (!emails.includes(PRIMARY_CHAT_ADMIN_EMAIL)) {
    emails.unshift(PRIMARY_CHAT_ADMIN_EMAIL);
  }

  return [...new Set(emails)];
}

function getFromAddress(): string {
  return process.env.CHAT_EMAIL_FROM || process.env.RESEND_FROM || DEFAULT_FROM;
}

async function sendViaResend(payload: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[chat-email] RESEND_API_KEY not configured');
    return { ok: false, error: 'Email not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[chat-email] Resend error:', errorText);
    return { ok: false, error: errorText };
  }

  return { ok: true };
}

export async function emailAdminChatStarted(input: {
  displayName: string;
  email: string;
  conversationId: string;
  isLoggedIn?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return { ok: false, error: 'No admin email configured' };
  }

  const appUrl = getAppUrl();
  const adminChatUrl = `${appUrl}/admin/chat`;
  const safeName = escapeHtml(input.displayName);
  const safeEmail = escapeHtml(input.email);
  const userType = input.isLoggedIn ? 'Signed-in user' : 'Guest';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f766e;">New Kids Zone chat started</h2>
      <p>Someone just opened a chat on Kids Zone.</p>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
      <p><strong>Type:</strong> ${userType}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p style="margin-top: 24px;">
        <a href="${adminChatUrl}" style="background: #0d9488; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Open Admin Chat
        </a>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        You will get another email when they send their first message.
      </p>
    </div>
  `;

  return sendViaResend({
    to: admins,
    subject: `New chat started — ${input.displayName}`,
    html,
    replyTo: input.email,
  });
}

export async function emailAdminNewChatMessage(input: {
  displayName: string;
  email: string;
  message: string;
  conversationId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return { ok: false, error: 'No admin email configured' };
  }

  const appUrl = getAppUrl();
  const adminChatUrl = `${appUrl}/admin/chat`;
  const safeName = escapeHtml(input.displayName);
  const safeEmail = escapeHtml(input.email);
  const safeMessage = escapeHtml(input.message);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f766e;">New Kids Zone chat message</h2>
      <p><strong>From:</strong> ${safeName}</p>
      <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr />
      <h3>Message</h3>
      <div style="background: #f0fdfa; padding: 16px; border-radius: 8px; white-space: pre-wrap; border-left: 4px solid #0d9488;">${safeMessage}</div>
      <p style="margin-top: 24px;">
        <a href="${adminChatUrl}" style="background: #0d9488; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Reply in Admin Chat
        </a>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        Conversation ID: ${escapeHtml(input.conversationId)}
      </p>
    </div>
  `;

  return sendViaResend({
    to: admins,
    subject: `New chat from ${input.displayName}`,
    html,
    replyTo: input.email,
  });
}

export async function emailUserChatReply(input: {
  displayName: string;
  email: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = input.email.trim().toLowerCase();
  if (!to.includes('@')) {
    return { ok: false, error: 'Invalid user email' };
  }

  const appUrl = getAppUrl();
  const chatUrl = `${appUrl}/chat`;
  const safeName = escapeHtml(input.displayName);
  const safeMessage = escapeHtml(input.message);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f766e;">Reply from Kids Zone</h2>
      <p>Hi ${safeName},</p>
      <p>The Kids Zone team replied to your chat:</p>
      <div style="background: #f0fdfa; padding: 16px; border-radius: 8px; white-space: pre-wrap; border-left: 4px solid #0d9488;">${safeMessage}</div>
      <p style="margin-top: 24px;">
        <a href="${chatUrl}" style="background: #0d9488; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Open Chat
        </a>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        You can also reply on the website chat popup on any page.
      </p>
    </div>
  `;

  return sendViaResend({
    to: [to],
    subject: 'Kids Zone replied to your message',
    html,
  });
}
