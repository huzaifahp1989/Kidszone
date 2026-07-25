# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16 (Turbopack) + React 19 + TypeScript** web app (an "Islamic Kids Learning Platform") with a Supabase backend and optional Firebase/Stripe/OneSignal integrations. The package manager is **npm** (`package-lock.json`). The `android/` and `ios/` folders are Capacitor wrappers and are not needed for web development (they require Android SDK / Xcode).

Standard commands live in `package.json` `scripts` (`dev`, `build`, `start`, `lint`, `test`). `npm run dev` serves on port `3000` (binds `0.0.0.0`).

Non-obvious caveats:

- **Env file:** Copy `.env.example` to `.env.local` (gitignored). Do NOT keep the literal placeholder values `your_supabase_project_url` / `your_supabase_anon_key` from `.env.example` — an invalid Supabase URL string makes `createClient` throw. Instead leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` blank so `src/lib/supabase.ts` falls back to the safe `https://placeholder.supabase.co` client in local/dev. On Vercel/production builds the client falls back to the known production Supabase project instead (see `src/lib/supabase-public-config.ts`). The console logs `[supabase] ... missing` warnings, which are expected when env is blank.
- **Auth-gated routes:** Most gameplay pages (`/quran-quiz`, `/quiz`, `/games`, `/quran-match`, `/profile`, etc.) require a real Supabase-authenticated session and redirect to `/signin` without one. They cannot be exercised end-to-end without real Supabase credentials. Routes under `/create/*` (e.g. `/create/coloring`) are interactive without login and are good for smoke-testing UI.
- **Pre-existing lint failures:** `npm run lint` exits non-zero due to pre-existing `react-hooks` errors in app code (e.g. `src/lib/use-quran-audio.ts`). The lint tooling itself works; these are not environment problems.

## Points system — do not break

Points are critical product behavior. Treat any points/Supabase regression as P0.

### Rules for every agent change

1. **Single award path:** All point awards must go through `awardPointsWithDailyCapByUserId` in `src/lib/server-points.ts` (or `/api/points/award` which calls it). Do **not** upsert `users_points` / `users.points` ad hoc in feature routes.
2. **Daily cap:** `POINTS_DAILY_CAP` is **200**. Cap math lives in `resolvePointsToAward` (`src/lib/points-policy.ts`). Do not remove or bypass the cap unless the call explicitly sets `countTowardDailyLimit: false` for a documented exception.
3. **Keep mirrors in sync:** Awards update `users_points` and then sync `users.points` / `users.weeklypoints` / `users.monthlypoints`. If you change one, change both.
4. **Tests before done:** Run `npm test -- src/lib/points-policy.test.ts src/lib/points-health.test.ts` (or `npm run test:points`). Both must pass. Do not weaken assertions to hide real regressions.
5. **Health check:** After points-related work, hit `/api/health/points` (or `/api/cron/points-health?manual=1` in non-prod). `ok: false` / HTTP 503 means fix before shipping.

### When "points not working" is reported

1. Call `GET /api/health/points` and read `issues[]` (`code`, `severity`, `fixHint`).
2. Common critical codes:
   - `supabase_url_missing` — deploy is using `placeholder.supabase.co` (no real Supabase env). Capacitor/live URL must target a Vercel project that has `NEXT_PUBLIC_SUPABASE_URL` / anon / service_role set. Canonical live host: `islamic-kids-platform.vercel.app`.
   - `service_role_missing` — set `SUPABASE_SERVICE_ROLE_KEY` in Vercel
   - `users_points_unreadable` / `users_points_schema` — table/RLS/schema broken in Supabase
   - `users_points_drift` — `users` mirror out of sync with `users_points`
   - `cap_math_broken` / `cap_not_enforced` — policy regression in code
3. Prefer repairing via the shared award path + admin recalc tools (`src/lib/points-repair.ts`, `/api/admin/recalc-stuck-weekly-points`) over one-off SQL unless schema is missing.
4. Re-run health check until `ok: true`.
5. If the Capacitor app / `LIVE_APP_URL` points at a deploy without Supabase env, points and auth will appear completely broken — fix `src/lib/app-url.ts` + `capacitor.config.ts` (or copy env vars into that Vercel project). `src/middleware.ts` 307-redirects `huzaifahp1989-audio.vercel.app` → `islamic-kids-platform.vercel.app` so already-installed Cap apps recover after deploy without a store rebuild. Client/server also fall back to the known production Supabase URL/anon key when env is missing on Vercel (never hardcode service_role).

### Scheduled guardian

Vercel cron hits `/api/cron/points-health` hourly (`vercel.json`). It is **read-only** (never awards points) and returns 503 on critical issues so monitors can alert.

### Optional recurring Cloud Agent

Create a Cursor Automation that every few hours:

1. Fetches production `/api/health/points`
2. If `ok` is false, opens a branch and fixes code/env docs based on `issues[].fixHint`
3. Runs `npm test -- src/lib/points-policy.test.ts src/lib/points-health.test.ts`
4. Does **not** change `POINTS_DAILY_CAP`, quiz/game point amounts, or invent a second award path

**Ready-made setup:** open [https://cursor.com/automations/new](https://cursor.com/automations/new), attach repo `huzaifahp1989/Kidszone`, schedule hourly, and paste the prompt from `.cursor/automations/points-health.md`.
