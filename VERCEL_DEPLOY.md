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
- ONESIGNAL_APP_ID=`0bb81263-a5f5-4fd8-8786-d71f43a43725` (WTN / primary push app)
- NEXT_PUBLIC_ONESIGNAL_APP_ID=`0bb81263-a5f5-4fd8-8786-d71f43a43725` (must match above)
- **ONESIGNAL_REST_API_KEY** — App API Key from **that same** OneSignal app  
  (`0bb81263…` → Settings → Keys & IDs → App API Key / REST API Key).  
  Do **not** paste the key from the old website app `daf8fc36…`.  
  After changing this value, **redeploy** (env changes do not apply to existing serverless instances until redeploy).

Optional OneSignal (old website subscribers):

- ONESIGNAL_LEGACY_APP_ID=`daf8fc36-781a-417d-8ee4-5078635f22e7`
- ONESIGNAL_LEGACY_REST_API_KEY — REST/App API Key from the **legacy** website app only
- NEXT_PUBLIC_ONESIGNAL_WEB_APP_ID=`daf8fc36-781a-417d-8ee4-5078635f22e7` (browser web push)

### Fix: “REST API key rejected for app 0bb81263…”

1. Open [OneSignal](https://dashboard.onesignal.com/) → app **0bb81263-a5f5-4fd8-8786-d71f43a43725** (not `daf8fc36…`).
2. Go to **Settings → Keys & IDs**.
3. Create or rotate an **App API Key** and copy the secret (shown once; starts with `os_v2_app_` for new keys).
4. In Vercel → Project → **Settings → Environment Variables**, set `ONESIGNAL_REST_API_KEY` to that value for Production (and Preview if needed).
5. If the previous value was the website app key, move it to `ONESIGNAL_LEGACY_REST_API_KEY` instead of deleting it.
6. Redeploy Production, then open Admin → Push and use **Diagnose saved tokens** (should show REST auth OK).

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
