# Move file storage to Cloudflare R2 (cheap)

Auth, users, points, and the database stay on **Supabase**.  
Only **files** (images + recordings) move to **Cloudflare R2**.

## 1. Create R2 in Cloudflare

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**.
2. Create a bucket, e.g. `kids-zone-media`.
3. **Settings → Public access**: enable a public bucket URL  
   (or attach a custom domain). Copy the public base URL  
   e.g. `https://pub-xxxxx.r2.dev`.
4. **Manage R2 API Tokens** → Create token with Object Read & Write on that bucket.  
   Copy **Access Key ID** and **Secret Access Key**.  
   Note your **Account ID** (sidebar / R2 overview).

## 2. Add env vars

### Local `.env.local`

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=kids-zone-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### Vercel (Production)

Add the same five variables in Vercel → Project → Settings → Environment Variables, then redeploy.

## 3. Behaviour

| When R2 is configured | Result |
|-----------------------|--------|
| New image uploads (vouchers, announcements, push) | → R2 |
| New audio recordings (studio, Quran, stories) | → R2 |
| Old files already on Supabase | Still play via Supabase (automatic fallback) |
| R2 env missing | Keeps using Supabase Storage (no break) |

## 4. Optional cleanup

After you’re happy everything works, delete large old files from Supabase Storage buckets `voucher-assets` and `story-recordings` to free quota. Do **not** delete until you’ve confirmed R2 playback.

## Cost

R2 is usually much cheaper than Supabase Storage and has **no egress fees** to the internet when using Cloudflare’s network.
