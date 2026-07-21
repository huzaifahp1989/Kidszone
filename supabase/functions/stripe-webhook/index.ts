import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

async function recordStripeCheckoutDonation(session: Stripe.Checkout.Session) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role configuration is missing.');
  }

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existing, error: existingError } = await supabase
    .from('kids_donations')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existingError && existingError.code !== '42P01') {
    throw existingError;
  }

  if (existing?.id) {
    if (paymentRequestId) {
      await supabase
        .from('donation_payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
        })
        .eq('id', paymentRequestId)
        .eq('status', 'pending');
    }
    return { created: false, sessionId: session.id };
  }

  const { error } = await supabase.from('kids_donations').insert({
    user_id: userId,
    donation_type: 'money',
    amount_pence: amountPence,
    description: description || 'Online sadaqah via Stripe',
    stripe_checkout_session_id: session.id,
  });

  if (error) {
    if (error.code === '23505') {
      if (paymentRequestId) {
        await supabase
          .from('donation_payment_requests')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
          })
          .eq('id', paymentRequestId)
          .eq('status', 'pending');
      }
      return { created: false, sessionId: session.id };
    }
    throw error;
  }

  if (paymentRequestId) {
    await supabase
      .from('donation_payment_requests')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
      })
      .eq('id', paymentRequestId)
      .eq('status', 'pending');
  }

  return { created: true, sessionId: session.id };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!stripe || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Stripe webhook is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        await recordStripeCheckoutDonation(session);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stripe webhook handler failed';
    console.error('[stripe-webhook]', message, error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
