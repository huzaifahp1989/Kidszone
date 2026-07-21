import { describe, expect, it } from 'vitest';
import {
  assertValidUsername,
  buildSiblingAuthEmail,
  isEmailLike,
  normalizeFamilyEmail,
  normalizeUsername,
  parseAge,
} from '@/lib/family-accounts';

describe('family-accounts helpers', () => {
  it('normalizes usernames', () => {
    expect(normalizeUsername(' Aisha_K ')).toBe('aisha_k');
    expect(normalizeUsername('Yusuf Khan')).toBe('yusuf_khan');
  });

  it('validates usernames', () => {
    expect(assertValidUsername('ab').ok).toBe(false);
    expect(assertValidUsername('aisha_k').ok).toBe(true);
  });

  it('detects emails', () => {
    expect(isEmailLike('parent@example.com')).toBe(true);
    expect(isEmailLike('aisha_k')).toBe(false);
  });

  it('builds sibling plus-address emails', () => {
    expect(buildSiblingAuthEmail('Parent@Example.com', 'yusuf_k')).toBe('parent+yusuf_k@example.com');
    expect(normalizeFamilyEmail(' Parent@Example.com ')).toBe('parent@example.com');
  });

  it('parses ages safely', () => {
    expect(parseAge('8')).toBe(8);
    expect(parseAge(0)).toBeNull();
    expect(parseAge('abc')).toBeNull();
  });
});
