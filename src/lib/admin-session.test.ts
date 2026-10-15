import { describe, expect, it } from 'vitest';
import { createAdminSessionToken, isValidAdminSessionToken } from './admin-session';

describe('admin review sessions', () => {
  it('accepts a signed, unexpired session token', () => {
    const now = Date.parse('2026-10-12T12:00:00.000Z');
    const token = createAdminSessionToken('test-secret', now);
    expect(isValidAdminSessionToken(token, 'test-secret', now + 1)).toBe(true);
  });

  it('rejects expired, altered, and wrongly signed tokens', () => {
    const now = Date.parse('2026-10-12T12:00:00.000Z');
    const token = createAdminSessionToken('test-secret', now);
    const [expiresAt, signature] = token.split('.');
    expect(isValidAdminSessionToken(token, 'test-secret', Number(expiresAt))).toBe(false);
    expect(isValidAdminSessionToken(`${expiresAt}.${signature.slice(0, -1)}x`, 'test-secret', now)).toBe(false);
    expect(isValidAdminSessionToken(token, 'another-secret', now)).toBe(false);
    expect(isValidAdminSessionToken('not-a-token', 'test-secret', now)).toBe(false);
  });
});
