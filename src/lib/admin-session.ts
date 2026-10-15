import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'kidszone_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const DEVELOPMENT_ADMIN_PASSWORD = 'admin123';
const DEVELOPMENT_SESSION_SECRET = 'kids-zone-local-development-session-secret';

export function getAdminSessionConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    password: process.env.ADMIN_PASSWORD || (isProduction ? '' : DEVELOPMENT_ADMIN_PASSWORD),
    secret: process.env.ADMIN_SESSION_SECRET || (isProduction ? '' : DEVELOPMENT_SESSION_SECRET),
  };
}

export function createAdminSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const signature = createHmac('sha256', secret).update(String(expiresAt)).digest('base64url');
  return `${expiresAt}.${signature}`;
}

export function isValidAdminSessionToken(token: string, secret: string, now = Date.now()): boolean {
  const [expiresAtText, signature, ...extra] = token.split('.');
  if (!expiresAtText || !signature || extra.length > 0) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || now >= expiresAt) return false;

  const expected = createHmac('sha256', secret).update(expiresAtText).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function isAdminSessionRequest(request: Request): boolean {
  const secret = getAdminSessionConfig().secret;
  if (!secret) return false;

  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return token ? isValidAdminSessionToken(token, secret) : false;
}

export function isValidAdminPassword(input: string, expected: string): boolean {
  const inputHash = createHmac('sha256', 'admin-password-check').update(input).digest();
  const expectedHash = createHmac('sha256', 'admin-password-check').update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}
