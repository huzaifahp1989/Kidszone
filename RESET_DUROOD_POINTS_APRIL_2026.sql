-- ============================================================
-- RESET DUROOD POINTS — April 2026
-- Pledge RECORDS are kept intact; only awarded points are removed.
-- Points formula: floor(count * 0.2) per pledge row
-- ============================================================

-- ── STEP 1: Preview — see how many points each user will lose ──
SELECT
  user_id,
  COUNT(*)                                       AS durood_pledge_count,
  SUM(count)                                     AS total_recitations,
  SUM(FLOOR(count * 0.2))::INTEGER               AS points_to_remove
FROM pledges
WHERE type = 'durood'
  AND created_at >= '2026-04-01'
  AND created_at <  '2026-05-01'
GROUP BY user_id
ORDER BY points_to_remove DESC;

-- ── STEP 2: Subtract from users_points (total_points only) ──
--   monthly_points is already reset each month so we don't touch it here.
--   GREATEST(0, ...) prevents going below zero.
WITH durood_pts AS (
  SELECT
    user_id,
    SUM(FLOOR(count * 0.2))::INTEGER AS pts
  FROM pledges
  WHERE type = 'durood'
    AND created_at >= '2026-04-01'
    AND created_at <  '2026-05-01'
  GROUP BY user_id
)
UPDATE users_points up
SET
  total_points = GREATEST(0, up.total_points - dp.pts)
FROM durood_pts dp
WHERE up.user_id = dp.user_id;

-- ── STEP 3: Sync snapshot in users table ──
WITH durood_pts AS (
  SELECT
    user_id,
    SUM(FLOOR(count * 0.2))::INTEGER AS pts
  FROM pledges
  WHERE type = 'durood'
    AND created_at >= '2026-04-01'
    AND created_at <  '2026-05-01'
  GROUP BY user_id
)
UPDATE users u
SET
  points = GREATEST(0, u.points - dp.pts)
FROM durood_pts dp
WHERE u.uid = dp.user_id;

-- ── STEP 4: Verify — confirm new totals ──
SELECT
  u.uid,
  u.username,
  u.points               AS users_total,
  up.total_points        AS users_points_total
FROM users u
JOIN users_points up ON up.user_id = u.uid
WHERE u.uid IN (
  SELECT DISTINCT user_id FROM pledges
  WHERE type = 'durood'
    AND created_at >= '2026-04-01'
    AND created_at <  '2026-05-01'
)
ORDER BY up.total_points DESC;
