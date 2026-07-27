/**
 * Admin email sending utility
 * Use this to send emails from admin pages
 */

type SendEmailOptions = {
  userIds?: string[];
  allUsers?: boolean;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

type SendEmailResult = {
  success: boolean;
  sent?: number;
  recipientCount?: number;
  message?: string;
  error?: string;
  warning?: string;
};

export async function sendAdminEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!options.subject?.trim()) {
    return { success: false, error: 'Subject is required' };
  }

  if (!options.html?.trim() && !options.text?.trim()) {
    return { success: false, error: 'HTML or text content is required' };
  }

  if (!options.allUsers && (!options.userIds || options.userIds.length === 0)) {
    return { success: false, error: 'Specify userIds or set allUsers to true' };
  }

  try {
    const response = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': 'true',
      },
      body: JSON.stringify({
        userIds: options.userIds,
        allUsers: options.allUsers,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send emails' };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Helper to build styled HTML email template
 */
export function buildEmailTemplate(content: string, title?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f5f3ff; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #6d28d9 100%); color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 12px 0 6px; font-size: 26px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.85; }
    .body { padding: 32px; }
    .body h2 { color: #1e1b4b; margin: 0 0 16px; font-size: 20px; }
    .body p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .footer { background: #ede9fe; padding: 20px 32px; text-align: center; font-size: 12px; color: #475569; border-top: 1px solid rgba(229,201,163,0.4); }
    .button { display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; padding: 14px 40px; border-radius: 14px; text-decoration: none; font-weight: 700; margin: 16px 0; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" class="container" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#6d28d9 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:48px;line-height:1;">🌙</div>
              <h1 style="color:#ffffff;margin:12px 0 6px;font-size:26px;font-weight:700;">Kids Zone</h1>
              <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Islamic Learning Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${title ? `<h2 style="color:#1e1b4b;margin:0 0 16px;font-size:20px;">${title}</h2>` : ''}
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#ede9fe;padding:20px 32px;text-align:center;border-top:1px solid rgba(229,201,163,0.4);">
              <p style="font-size:12px;color:#475569;margin:0;">© 2026 Kids Zone — Islam Media Central</p>
              <p style="font-size:11px;color:#c4956a;margin:6px 0 0;">This is an automated message from the Kids Zone Admin Panel.</p>
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
