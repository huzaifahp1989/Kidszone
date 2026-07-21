-- Normalize leaderboard weekly points.
-- Policy: hard cap weekly points at 500.
-- Any user above 500 is reduced to 500.
-- Run once in Supabase SQL editor.

begin;

-- users_points is the primary source used by leaderboard queries.
update users_points
set weekly_points = 500
where coalesce(weekly_points, 0) > 500;

-- Keep legacy mirror in sync.
update users
set weeklypoints = 500
where coalesce(weeklypoints, 0) > 500;

commit;

-- Verify: should return 0 rows after running.
select count(*) as users_points_above_500
from users_points
where coalesce(weekly_points, 0) > 500;

select count(*) as users_above_500
from users
where coalesce(weeklypoints, 0) > 500;
