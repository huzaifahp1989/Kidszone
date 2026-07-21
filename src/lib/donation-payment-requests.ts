import { randomBytes } from 'crypto';
import { parseAmountToPence } from '@/lib/donations';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAppBaseUrl } from '@/lib/stripe';
import {
  MAX_STRIPE_DONATION_PENCE,
  MIN_STRIPE_DONATION_PENCE,
} from '@/lib/stripe-donation-constants';

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 10;
const DEFAULT_EXPIRY_HOURS = 168;

export type DonationPaymentRequest = {
  id: string;
  token: string;
  userId: string;
  amountPence: number;
  description: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  stripeCheckoutSessionId: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type DonationPaymentRequestPublic = {
  token: string;
  childName: string;
  amountPence: number;
  description: string;
  status: DonationPaymentRequest['status'];
  expiresAt: string;
  isExpired: boolean;
  isPaid: boolean;
  parentPayUrl: string;
};

function randomToken() {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

function normalizeRow(row: Record<string, unknown>): DonationPaymentRequest {
  return {
    id: String(row.id),
    token: String(row.token),
    userId: String(row.user_id),
    amountPence: Number(row.amount_pence ?? 0),
    description: String(row.description || ''),
    status: String(row.status || 'pending') as DonationPaymentRequest['status'],
    stripeCheckoutSessionId: row.stripe_checkout_session_id
      ? String(row.stripe_checkout_session_id)
      : null,
    expiresAt: String(row.expires_at),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at),
  };
}

function isExpired(request: DonationPaymentRequest) {
  return new Date(request.expiresAt).getTime() <= Date.now();
}

export function getParentPayUrl(token: string) {
  return `${getAppBaseUrl()}/donations/pay/${token}`;
}

export function buildParentShareMessage(childName: string, amountPence: number, payUrl: string) {
  const amount = `£${(amountPence / 100).toFixed(2)}`;
  return `Assalamu alaikum! ${childName} wants to give sadaqah on Kids Zone. Please can you help with ${amount}? Pay securely here: ${payUrl}`;
}

export async function createDonationPaymentRequest(input: {
  userId: string;
  amount: string | number;
  description: string;
  expiresInHours?: number;
}) {
  const amountPence = parseAmountToPence(input.amount);
  const description = String(input.description || '').trim();

  if (description.length < 3) {
    throw new Error('Please describe the sadaqah (at least 3 characters).');
  }

  if (description.length > 500) {
    throw new Error('Description is too long (max 500 characters).');
  }

  if (amountPence < MIN_STRIPE_DONATION_PENCE) {
    throw new Error(`Minimum donation is £${(MIN_STRIPE_DONATION_PENCE / 100).toFixed(2)}.`);
  }

  if (amountPence > MAX_STRIPE_DONATION_PENCE) {
    throw new Error(`Maximum donation is £${(MAX_STRIPE_DONATION_PENCE / 100).toFixed(2)}.`);
  }

  const expiresInHours = Number(input.expiresInHours || DEFAULT_EXPIRY_HOURS);
  const boundedHours = Math.max(1, Math.min(168, Number.isFinite(expiresInHours) ? expiresInHours : DEFAULT_EXPIRY_HOURS));
  const expiresAt = new Date(Date.now() + boundedHours * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = randomToken();
    const { data, error } = await supabaseAdmin
      .from('donation_payment_requests')
      .insert({
        token,
        user_id: input.userId,
        amount_pence: amountPence,
        description,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (!error && data) {
      const request = normalizeRow(data as Record<string, unknown>);
      return {
        request,
        parentPayUrl: getParentPayUrl(request.token),
      };
    }

    if (error?.code !== '23505') {
      if (error?.code === '42P01') {
        throw new Error('Payment requests table missing. Run SETUP_DONATION_PAYMENT_REQUESTS.sql in Supabase.');
      }
      throw new Error(error?.message || 'Could not save the payment link.');
    }
  }

  throw new Error('Could not create a payment link. Please try again.');
}

export async function getDonationPaymentRequestByToken(tokenRaw: string) {
  const token = String(tokenRaw || '').trim().toUpperCase();
  if (!token) return null;

  const { data, error } = await supabaseAdmin
    .from('donation_payment_requests')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Payment requests table missing. Run SETUP_DONATION_PAYMENT_REQUESTS.sql in Supabase.');
    }
    throw error;
  }

  if (!data) return null;

  const request = normalizeRow(data as Record<string, unknown>);

  if (request.status === 'pending' && isExpired(request)) {
    await supabaseAdmin
      .from('donation_payment_requests')
      .update({ status: 'expired' })
      .eq('id', request.id)
      .eq('status', 'pending');
    request.status = 'expired';
  }

  return request;
}

export async function getDonationPaymentRequestPublic(tokenRaw: string): Promise<DonationPaymentRequestPublic | null> {
  const request = await getDonationPaymentRequestByToken(tokenRaw);
  if (!request) return null;

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('name')
    .eq('uid', request.userId)
    .maybeSingle();

  const childName = String(userRow?.name || 'A Kids Zone learner').trim() || 'A Kids Zone learner';
  const expired = request.status === 'expired' || (request.status === 'pending' && isExpired(request));
  const paid = request.status === 'paid';

  return {
    token: request.token,
    childName,
    amountPence: request.amountPence,
    description: request.description,
    status: expired ? 'expired' : request.status,
    expiresAt: request.expiresAt,
    isExpired: expired,
    isPaid: paid,
    parentPayUrl: getParentPayUrl(request.token),
  };
}

export async function markDonationPaymentRequestPaid(input: {
  paymentRequestId?: string;
  stripeCheckoutSessionId: string;
}) {
  const paymentRequestId = String(input.paymentRequestId || '').trim();
  if (!paymentRequestId) return;

  await supabaseAdmin
    .from('donation_payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
    })
    .eq('id', paymentRequestId)
    .eq('status', 'pending');
}

export async function attachCheckoutSessionToPaymentRequest(input: {
  paymentRequestId: string;
  stripeCheckoutSessionId: string;
}) {
  await supabaseAdmin
    .from('donation_payment_requests')
    .update({
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
    })
    .eq('id', input.paymentRequestId)
    .eq('status', 'pending');
}
