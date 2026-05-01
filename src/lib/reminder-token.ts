import crypto from 'crypto';

const TOKEN_SECRET = process.env.REMINDER_TOKEN_SECRET || process.env.CRON_SECRET || 'dev-reminder-secret';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function createReminderToken(uid: string): string {
  const payload = base64UrlEncode(uid);
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyReminderToken(token: string): { valid: boolean; uid?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [payload, providedSig] = token.split('.');
  if (!payload || !providedSig) return { valid: false };

  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (providedSig !== expectedSig) return { valid: false };

  try {
    const uid = base64UrlDecode(payload);
    if (!uid) return { valid: false };
    return { valid: true, uid };
  } catch {
    return { valid: false };
  }
}
