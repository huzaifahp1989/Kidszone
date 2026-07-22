# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16 (Turbopack) + React 19 + TypeScript** web app (an "Islamic Kids Learning Platform") with a Supabase backend and optional Firebase/Stripe/OneSignal integrations. The package manager is **npm** (`package-lock.json`). The `android/` and `ios/` folders are Capacitor wrappers and are not needed for web development (they require Android SDK / Xcode).

Standard commands live in `package.json` `scripts` (`dev`, `build`, `start`, `lint`, `test`). `npm run dev` serves on port `3000` (binds `0.0.0.0`).

Non-obvious caveats:

- **Env file:** Copy `.env.example` to `.env.local` (gitignored). Do NOT keep the literal placeholder values `your_supabase_project_url` / `your_supabase_anon_key` from `.env.example` — an invalid Supabase URL string makes `createClient` throw. Instead leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` blank so `src/lib/supabase.ts` falls back to the safe `https://placeholder.supabase.co` client. With this fallback the dev server runs fine (Supabase calls just fail gracefully); the console logs `[supabase] ... missing` warnings, which are expected.
- **Auth-gated routes:** Most gameplay pages (`/quran-quiz`, `/quiz`, `/games`, `/quran-match`, `/profile`, etc.) require a real Supabase-authenticated session and redirect to `/signin` without one. They cannot be exercised end-to-end without real Supabase credentials. Routes under `/create/*` (e.g. `/create/coloring`) are interactive without login and are good for smoke-testing UI.
- **Pre-existing lint failures:** `npm run lint` exits non-zero due to pre-existing `react-hooks` errors in app code (e.g. `src/lib/use-quran-audio.ts`). The lint tooling itself works; these are not environment problems.
- **Pre-existing test failure:** `npm test` (vitest) has one pre-existing failing test in `src/lib/points-policy.test.ts` (`DAILY_PLAN_TOTAL_POINTS` expected 200 but code is 225). The other 52 tests pass.
