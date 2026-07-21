-- ============================================================================
-- Recalculate leaderboard points for users stuck at the old 500 weekly cap.
-- Uses current score week (Saturday 00:00 UK → Friday) and rules:
--   • +25 per completed quiz (score = max_score)
--   • +25 per game session
--   • +25 per pledge (count >= 5)
--   • 200 points max per UK calendar day
-- Only INCREASES weekly/total/monthly for users with weekly_points >= 500
-- where activity shows they earned more than recorded.
--
-- STEP 1: Run the PREVIEW query below first.
-- STEP 2: If it looks correct, run the UPDATE block.
-- ============================================================================

-- ─── PREVIEW (safe to run) ───────────────────────────────────────────────────
WITH london_now AS (
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London') AS ts
),
week_bounds AS (
  SELECT
    (ts::date - ((EXTRACT(DOW FROM ts)::integer + 1) % 7)) AS week_start_date,
    (ts::date - ((EXTRACT(DOW FROM ts)::integer + 1) % 7)) + 7 AS week_end_date
  FROM london_now
),
bounds AS (
  SELECT
    week_start_date,
    week_end_date,
    (week_start_date::timestamp AT TIME ZONE 'Europe/London') AS week_start_utc,
    (week_end_date::timestamp AT TIME ZONE 'Europe/London') AS week_end_utc
  FROM week_bounds
),
raw_events AS (
  SELECT
    qa.user_id,
    (qa.completed_at AT TIME ZONE 'Europe/London')::date AS activity_day,
    25 AS pts
  FROM quiz_attempts qa
  CROSS JOIN bounds b
  WHERE qa.completed_at >= b.week_start_utc
    AND qa.completed_at < b.week_end_utc
    AND qa.max_score > 0
    AND qa.score >= qa.max_score

  UNION ALL

  SELECT
    gp.uid AS user_id,
    (gp.playedat AT TIME ZONE 'Europe/London')::date AS activity_day,
    25 AS pts
  FROM game_progress gp
  CROSS JOIN bounds b
  WHERE gp.playedat IS NOT NULL
    AND gp.playedat >= b.week_start_utc
    AND gp.playedat < b.week_end_utc

  UNION ALL

  SELECT
    p.user_id,
    (p.created_at AT TIME ZONE 'Europe/London')::date AS activity_day,
    25 AS pts
  FROM pledges p
  CROSS JOIN bounds b
  WHERE p.created_at >= b.week_start_utc
    AND p.created_at < b.week_end_utc
    AND COALESCE(p.count, 0) >= 5
),
daily_totals AS (
  SELECT user_id, activity_day, SUM(pts) AS raw_day_pts
  FROM raw_events
  GROUP BY user_id, activity_day
),
daily_capped AS (
  SELECT user_id, activity_day, LEAST(200, raw_day_pts) AS day_pts
  FROM daily_totals
),
recalculated AS (
  SELECT user_id, COALESCE(SUM(day_pts), 0)::integer AS new_weekly
  FROM daily_capped
  GROUP BY user_id
),
stuck_users AS (
  SELECT
    up.user_id,
    u.name,
    u.email,
    up.weekly_points AS old_weekly,
    up.total_points AS old_total,
    COALESCE(r.new_weekly, 0) AS new_weekly,
    GREATEST(0, COALESCE(r.new_weekly, 0) - COALESCE(up.weekly_points, 0)) AS weekly_gain,
    b.week_start_date,
    b.week_end_date
  FROM users_points up
  LEFT JOIN users u ON u.uid = up.user_id
  LEFT JOIN recalculated r ON r.user_id = up.user_id
  CROSS JOIN bounds b
  WHERE COALESCE(up.weekly_points, 0) >= 500
)
SELECT
  week_start_date,
  week_end_date,
  user_id,
  name,
  email,
  old_weekly,
  new_weekly,
  weekly_gain,
  old_total,
  old_total + weekly_gain AS new_total
FROM stuck_users
WHERE weekly_gain > 0
ORDER BY weekly_gain DESC, new_weekly DESC;


-- ─── APPLY UPDATES (run after preview looks correct) ─────────────────────────
BEGIN;

WITH london_now AS (
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London') AS ts
),
week_bounds AS (
  SELECT
    (ts::date - ((EXTRACT(DOW FROM ts)::integer + 1) % 7)) AS week_start_date,
    (ts::date - ((EXTRACT(DOW FROM ts)::integer + 1) % 7)) + 7 AS week_end_date
  FROM london_now
),
bounds AS (
  SELECT
    (week_start_date::timestamp AT TIME ZONE 'Europe/London') AS week_start_utc,
    (week_end_date::timestamp AT TIME ZONE 'Europe/London') AS week_end_utc
  FROM week_bounds
),
raw_events AS (
  SELECT qa.user_id, (qa.completed_at AT TIME ZONE 'Europe/London')::date AS activity_day, 25 AS pts
  FROM quiz_attempts qa CROSS JOIN bounds b
  WHERE qa.completed_at >= b.week_start_utc AND qa.completed_at < b.week_end_utc
    AND qa.max_score > 0 AND qa.score >= qa.max_score
  UNION ALL
  SELECT gp.uid, (gp.playedat AT TIME ZONE 'Europe/London')::date, 25
  FROM game_progress gp CROSS JOIN bounds b
  WHERE gp.playedat IS NOT NULL AND gp.playedat >= b.week_start_utc AND gp.playedat < b.week_end_utc
  UNION ALL
  SELECT p.user_id, (p.created_at AT TIME ZONE 'Europe/London')::date, 25
  FROM pledges p CROSS JOIN bounds b
  WHERE p.created_at >= b.week_start_utc AND p.created_at < b.week_end_utc AND COALESCE(p.count, 0) >= 5
),
daily_totals AS (
  SELECT user_id, activity_day, SUM(pts) AS raw_day_pts FROM raw_events GROUP BY user_id, activity_day
),
daily_capped AS (
  SELECT user_id, activity_day, LEAST(200, raw_day_pts) AS day_pts FROM daily_totals
),
recalculated AS (
  SELECT user_id, COALESCE(SUM(day_pts), 0)::integer AS new_weekly FROM daily_capped GROUP BY user_id
),
fixes AS (
  SELECT
    up.user_id,
    up.weekly_points AS old_weekly,
    up.total_points AS old_total,
    up.monthly_points AS old_monthly,
    r.new_weekly,
    GREATEST(0, r.new_weekly - COALESCE(up.weekly_points, 0)) AS gain
  FROM users_points up
  INNER JOIN recalculated r ON r.user_id = up.user_id
  WHERE COALESCE(up.weekly_points, 0) >= 500
    AND r.new_weekly > COALESCE(up.weekly_points, 0)
)
UPDATE users_points up
SET
  weekly_points = f.new_weekly,
  total_points = f.old_total + f.gain,
  monthly_points = COALESCE(f.old_monthly, 0) + f.gain,
  badges = FLOOR((f.old_total + f.gain) / 100.0)::integer,
  level = 1 + FLOOR(FLOOR((f.old_total + f.gain) / 100.0) / 5.0)::integer,
  updated_at = NOW()
FROM fixes f
WHERE up.user_id = f.user_id;

UPDATE users u
SET
  points = up.total_points,
  weeklypoints = up.weekly_points,
  monthlypoints = up.monthly_points,
  updatedat = NOW()
FROM users_points up
WHERE u.uid = up.user_id
  AND COALESCE(up.weekly_points, 0) > 500;

COMMIT;

-- Verify: users above old cap should now reflect activity-based weekly totals
SELECT
  up.user_id,
  u.name,
  up.weekly_points,
  up.total_points,
  up.monthly_points
FROM users_points up
LEFT JOIN users u ON u.uid = up.user_id
WHERE COALESCE(up.weekly_points, 0) >= 500
ORDER BY up.weekly_points DESC
LIMIT 50;
