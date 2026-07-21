import type { DonationEntry, DonationType } from '@/types/donation';

export const DONATION_TYPES: Array<{
  key: DonationType;
  label: string;
  emoji: string;
  hint: string;
}> = [
  { key: 'money', label: 'Money / Sadaqah', emoji: '🪙', hint: 'Coins, notes, or pocket money given for Allah' },
  { key: 'food', label: 'Food', emoji: '🍲', hint: 'Sharing food with someone in need' },
  { key: 'clothes', label: 'Clothes', emoji: '👕', hint: 'Donating clothes you no longer need' },
  { key: 'toys', label: 'Toys & gifts', emoji: '🎁', hint: 'Sharing toys or gifts kindly' },
  { key: 'help', label: 'Helping others', emoji: '🤝', hint: 'Helping neighbours, family, or charity work' },
  { key: 'other', label: 'Other good deed', emoji: '✨', hint: 'Any other act of charity or kindness' },
];

const donationTypeSet = new Set<DonationType>(DONATION_TYPES.map((item) => item.key));

export function isDonationType(value: string): value is DonationType {
  return donationTypeSet.has(value as DonationType);
}

export function normalizeDonationRow(row: Record<string, unknown>): DonationEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    donationType: String(row.donation_type || 'other') as DonationType,
    amountPence: Number(row.amount_pence ?? 0),
    description: String(row.description || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    stripeCheckoutSessionId: row.stripe_checkout_session_id
      ? String(row.stripe_checkout_session_id)
      : null,
  };
}

export function formatDonationAmount(amountPence: number): string {
  if (!Number.isFinite(amountPence) || amountPence <= 0) return '—';
  return `£${(amountPence / 100).toFixed(2)}`;
}

export function getDonationTypeLabel(type: DonationType): string {
  return DONATION_TYPES.find((item) => item.key === type)?.label || 'Charity';
}

export function getDonationTypeEmoji(type: DonationType): string {
  return DONATION_TYPES.find((item) => item.key === type)?.emoji || '✨';
}

export function parseAmountToPence(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return 0;
    return Math.round(input * 100);
  }

  const trimmed = String(input || '').trim();
  if (!trimmed) return 0;

  const normalized = trimmed.replace(/[£,\s]/g, '');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}
