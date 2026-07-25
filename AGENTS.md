# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16 (Turbopack) + React 19 + TypeScript** web app (an "Islamic Kids Learning Platform") with a Supabase backend and optional Firebase/Stripe/OneSignal integrations. The package manager is **npm** (`package-lock.json`). The `android/` and `ios/` folders are Capacitor wrappers and are not needed for web development (they require Android SDK / Xcode).

Standard commands live in `package.json` `scripts` (`dev`, `build`, `start`, `lint`, `test`). `npm run dev` serves on port `3000` (binds `0.0.0.0`).

Non-obvious caveats:

- **Env file:** Copy `.env.example` to `.env.local` (gitignored). Do NOT keep the literal placeholder values `your_supabase_project_url` / `your_supabase_anon_key` from `.env.example` — an invalid Supabase URL string makes `createClient` throw. For **sign-in and points**, set real values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (see `src/lib/supabase-public-config.ts` for the production project URL/anon key). If those vars are left blank, local dev auto-falls back to the bundled production Supabase project so auth works without manual setup.
- **Auth-gated routes:** Most gameplay pages (`/quran-quiz`, `/quiz`, `/games`, `/quran-match`, `/profile`, etc.) require a real Supabase-authenticated session and redirect to `/signin` without one. They cannot be exercised end-to-end without real Supabase credentials. Routes under `/create/*` (e.g. `/create/coloring`) are interactive without login and are good for smoke-testing UI.
- **Pre-existing lint failures:** `npm run lint` exits non-zero due to pre-existing `react-hooks` errors in app code (e.g. `src/lib/use-quran-audio.ts`). The lint tooling itself works; these are not environment problems.
- **Points system:** Daily earn cap is **200** pts (UTC). The earning plan lists up to **225** pts of activities — kids pick a mix up to the cap. Points refresh through **GET `/api/me/points`** (service role) so the navbar stays accurate under Cap/RLS.
- **Tests:** `npm test` (vitest) — all **68** tests pass. `DAILY_PLAN_TOTAL_POINTS` is **225** (plan rows sum above the **200** daily cap by design).
