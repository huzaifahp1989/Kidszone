import { describe, expect, it } from 'vitest';
import {
  formatDonationAmount,
  isDonationType,
  parseAmountToPence,
} from '@/lib/donations';

describe('parseAmountToPence', () => {
  it('parses pound strings and numbers', () => {
    expect(parseAmountToPence('2.50')).toBe(250);
    expect(parseAmountToPence('£3')).toBe(300);
    expect(parseAmountToPence(1.25)).toBe(125);
  });

  it('returns 0 for invalid amounts', () => {
    expect(parseAmountToPence('')).toBe(0);
    expect(parseAmountToPence('-1')).toBe(0);
    expect(parseAmountToPence('abc')).toBe(0);
  });
});

describe('formatDonationAmount', () => {
  it('formats pence as pounds', () => {
    expect(formatDonationAmount(250)).toBe('£2.50');
    expect(formatDonationAmount(0)).toBe('—');
  });
});

describe('isDonationType', () => {
  it('accepts known donation types', () => {
    expect(isDonationType('money')).toBe(true);
    expect(isDonationType('help')).toBe(true);
    expect(isDonationType('invalid')).toBe(false);
  });
});
