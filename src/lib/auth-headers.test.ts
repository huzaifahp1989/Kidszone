import { describe, expect, it } from 'vitest';
import { shouldAttemptAuthRefresh } from '@/lib/auth-headers';

describe('shouldAttemptAuthRefresh', () => {
  it('skips refresh attempts when there is no recoverable session', () => {
    expect(shouldAttemptAuthRefresh(401, false, false)).toBe(false);
    expect(shouldAttemptAuthRefresh(401, true, false)).toBe(false);
  });

  it('allows a refresh retry when there is a stored token and an active session', () => {
    expect(shouldAttemptAuthRefresh(401, true, true)).toBe(true);
  });
});
