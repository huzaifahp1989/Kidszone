# Stripe webhook (Supabase Edge Function)

Production Stripe webhooks should point at your Supabase Edge Function:

`https://jlqrbbqsuksncrxjcmbc.supabase.co/functions/v1/stripe-webhook`

## 1. Run the donations SQL

If you have not already:

- `SETUP_KIDS_DONATIONS.sql`
- `supabase/migrations/20260707_kids_donations_stripe.sql`

## 2. Deploy the Edge Function

From the project root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed):

```bash
supabase link --project-ref jlqrbbqsuksncrxjcmbc
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase functions deploy stripe-webhook --no-verify-jwt
```

`verify_jwt` must be off so Stripe can call the endpoint without a Supabase login token.

## 3. Add the webhook in Stripe

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL:
   `https://jlqrbbqsuksncrxjcmbc.supabase.co/functions/v1/stripe-webhook`
3. Event: `checkout.session.completed`
4. Copy the **Signing secret** (`whsec_...`)
5. Set it in Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 4. App env vars (Vercel / `.env.local`)

The Next.js app still creates Checkout sessions. It does **not** need `STRIPE_WEBHOOK_SECRET` when using the Supabase webhook.

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 5. Test

1. Sign in → `/donations`
2. Choose **Money** → **Pay online**
3. Pay with test card `4242 4242 4242 4242`
4. Check Stripe webhook delivery logs and `kids_donations` in Supabase

## Local webhook testing

Option A — forward to Supabase (after `supabase functions serve stripe-webhook`):

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Option B — forward to the Next.js dev route:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_...` from `stripe listen` in the matching environment (Supabase secrets or `.env.local`).
