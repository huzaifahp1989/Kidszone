import type Stripe from 'stripe';
import { markDonationPaymentRequestPaid } from '@/lib/donation-payment-requests';
import { normalizeDonationRow } from '@/lib/donations';
import { getAppBaseUrl, getStripeClient } from '@/lib/stripe';
import {
  MAX_STRIPE_DONATION_PENCE,
  MIN_STRIPE_DONATION_PENCE,
} from '@/lib/stripe-donation-constants';
import { supabaseAdmin } from '@/lib/supabase-admin';

export {
  DONATION_PRESET_AMOUNTS_PENCE,
  MAX_STRIPE_DONATION_PENCE,
  MIN_STRIPE_DONATION_PENCE,
} from '@/lib/stripe-donation-constants';

export type CreateDonationCheckoutInput = {
  userId: string;
  amountPence: number;
  description: string;
  paymentRequestId?: string;
  paymentRequestToken?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export async function createDonationCheckoutSession(input: CreateDonationCheckoutInput) {
  const stripe = getStripeClient();
  const appUrl = getAppBaseUrl();
  const token = String(input.paymentRequestToken || '').trim();

  const successUrl =
    input.successUrl ||
    (token
      ? `${appUrl}/donations/pay/${token}?payment=success`
      : `${appUrl}/donations?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl =
    input.cancelUrl ||
    (token
      ? `${appUrl}/donations/pay/${token}?payment=cancelled`
      : `${appUrl}/donations?payment=cancelled`);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: input.amountPence,
          product_data: {
            name: 'Kids Sadaqah',
            description: input.description.slice(0, 200),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: input.userId,
      donationType: 'money',
      description: input.description,
      ...(input.paymentRequestId ? { paymentRequestId: input.paymentRequestId } : {}),
      ...(token ? { paymentRequestToken: token } : {}),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new Error('Could not start Stripe checkout.');
  }

  return session;
}

export async function recordStripeCheckoutDonation(session: Stripe.Checkout.Session) {
  const userId = String(session.metadata?.userId || '').trim();
  const description = String(session.metadata?.description || '').trim();
  const paymentRequestId = String(session.metadata?.paymentRequestId || '').trim();
  const amountPence = Number(session.amount_total ?? 0);

  if (!userId) {
    throw new Error('Stripe checkout session is missing userId metadata.');
  }

  if (!Number.isFinite(amountPence) || amountPence <= 0) {
    throw new Error('Stripe checkout session has an invalid amount.');
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('kids_donations')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existingError && existingError.code !== '42P01') {
    throw existingError;
  }

  if (existing?.id) {
    if (paymentRequestId) {
      await markDonationPaymentRequestPaid({
        paymentRequestId,
        stripeCheckoutSessionId: session.id,
      });
    }
    return { created: false, sessionId: session.id };
  }

  const { data, error } = await supabaseAdmin
    .from('kids_donations')
    .insert({
      user_id: userId,
      donation_type: 'money',
      amount_pence: amountPence,
      description: description || 'Online sadaqah via Stripe',
      stripe_checkout_session_id: session.id,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      if (paymentRequestId) {
        await markDonationPaymentRequestPaid({
          paymentRequestId,
          stripeCheckoutSessionId: session.id,
        });
      }
      return { created: false, sessionId: session.id };
    }
    throw error;
  }

  if (paymentRequestId) {
    await markDonationPaymentRequestPaid({
      paymentRequestId,
      stripeCheckoutSessionId: session.id,
    });
  }

  return {
    created: true,
    sessionId: session.id,
    entry: normalizeDonationRow(data as Record<string, unknown>),
  };
}
