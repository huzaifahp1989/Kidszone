Vercel deployment notes

Required environment variables (set these in the Vercel Project Settings → Environment Variables):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- ONESIGNAL_APP_ID

Quick deploy

1. Connect the repository to Vercel (Import Project).
2. In Project Settings → Environment Variables, add the keys above (use the values from your Supabase/Stripe/Resend/OneSignal dashboards).
3. Deploy (Vercel will run `npm run build`).

Notes & tips

- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public keys used by the client; `SUPABASE_SERVICE_ROLE_KEY` is secret and only required for server-side admin routes.
- If you use webhooks (Stripe), set `STRIPE_WEBHOOK_SECRET` in Vercel and configure your webhook URL to point to `https://<your-deployment>/api/stripe/webhook`.
- For local testing of Vercel env vars, use `vercel env pull` or set them in a `.env.local` (do NOT commit secrets).
- If you host on Vercel and use Supabase Realtime / channels, make sure network access and CORS settings in Supabase allow your Vercel domain.

Commands (Vercel CLI)

```bash
# Deploy interactively
vercel
# Deploy production
vercel --prod
```