# Virtual Hajj 3D learning MVP

The new `/games/hajj/virtual-world` route is an isolated, client-loaded Three.js activity. It leaves the existing 2D Tawaf game in place and links to it when WebGL is unavailable. The 3D scene uses procedural geometry only; it downloads no models, textures, or audio.

## Deploying

1. Deploy the application code and dependencies with the normal Next.js deployment process.
2. Apply `supabase/migrations/20261012_virtual_hajj_mvp.sql` to the same Supabase project as the existing points system (for example, run `supabase db push` from the repository root when the Supabase CLI is linked to that project).
3. Confirm the existing `award_points_capped(UUID, INT, INT, BOOLEAN)` routine is deployed first. The migration creates the challenge-attempt, reward-claim, and level-progress tables and grants access only to `service_role`; it does not create a separate points balance.
4. Keep the server's existing Supabase service-role configuration secret. The browser only submits authenticated answers; the server grades the fixed question set, and the database transaction enforces the daily attempt limit, once-per-day claim, level unlock, and existing 200-point cap.

## MVP contents

- Responsive 3D Kaaba/courtyard learning model, third-person follow camera, pointer-drag camera orbit, keyboard movement, and a touch joystick.
- Seven ordered checkpoint markers per lap and seven laps, with pause, resume, restart, progress display, loading/error states, and a WebGL fallback to the existing 2D Tawaf route.
- A daily, three-question knowledge challenge. Movement/checkpoints do not grant points; only server-graded answers can claim the configured game-activity reward, once per UTC day, with at most five attempts per day.
- A Safa and Marwah educational card that unlocks after a successful Tawaf knowledge challenge. It is a reading lesson, not a second 3D activity.
- No music, human characters, external 3D assets, or claim that gameplay fulfils Hajj or Umrah.

## Review and device testing still required

The Quran references and copy are provided as draft educational content and have **not** been reviewed by a qualified Islamic teacher. Have a qualified teacher review all religious content and the model before public release. Browser automation/build validation is not a substitute for testing performance, touch controls, orientation changes, and WebView behavior on real Android and iOS phones/tablets.
