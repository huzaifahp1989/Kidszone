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
- ONESIGNAL_APP_ID=`0bb81263-a5f5-4fd8-8786-d71f43a43725` (WTN / native app)
- **ONESIGNAL_REST_API_KEY** = App API Key / REST API Key from **that same** OneSignal app (Settings → Keys & IDs). Required for Admin → Push.
- Optional: `ONESIGNAL_LEGACY_APP_ID` + `ONESIGNAL_LEGACY_REST_API_KEY` for the old website app `daf8fc36-…`

### OneSignal push not sending from Admin

Production diagnosis: the configured `ONESIGNAL_REST_API_KEY` is an `os_v2_app_…` key that can look up devices on app `0bb81263…` but **cannot create notifications** (HTTP 401 Access denied on the Notifications API).

1. Open OneSignal → app **0bb81263…** (WTN) → Settings → Keys & IDs.
2. Create a **new App API Key** and enable **Create Notifications** (full send permission).
3. Paste it into Vercel Production env `ONESIGNAL_REST_API_KEY`.
4. If you still need the website app `daf8fc36…`, set its key on `ONESIGNAL_LEGACY_REST_API_KEY`.
5. **Redeploy** after saving env vars (env changes do not apply until redeploy).
6. Admin → Push — the red banner should clear; send a test notification.

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