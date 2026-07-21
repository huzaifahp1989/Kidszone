# Salah Tracking

## Database
- Apply [SUPABASE_MIGRATION_002_SALAH_TRACKING.sql](file:///c:/Users/huzai/Islamic-Kids-Learning-Platform/SUPABASE_MIGRATION_002_SALAH_TRACKING.sql) in Supabase SQL editor.
- Table: `public.salah_entries`
  - Unique key: `(user_id, date, prayer)`
  - Status: `completed` | `missed`
  - `prayed_at` is optional and auto-filled when a prayer is saved as `completed` without a time.

## API
- `GET /api/salah/entries?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/salah/entries` body: `{ date, prayer, status, prayedAt?, notes? }`
- `PUT /api/salah/entries` body: `{ id, status?, prayedAt?, notes? }`
- `DELETE /api/salah/entries?id=<entryId>`
- `GET /api/salah/stats?range=weekly|monthly&date=YYYY-MM-DD`

All endpoints require `Authorization: Bearer <supabase_access_token>` and only operate on the authenticated user.

## UI
- Page: `/salah` (Calendar + daily log editor + weekly/monthly stats)

## Reminders
- The reminders button requests:
  - Notification permission (browser)
  - Geolocation permission (browser)
- Prayer times are fetched from `api.aladhan.com`.
- Notifications are scheduled in the browser while the app is open; background delivery requires native/push notification infrastructure.

## Tests
- Run: `npm test`
