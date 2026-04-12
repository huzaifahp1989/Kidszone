-- Function to increment points for a user (used by server-side APIs)
-- This allows incrementing points without being logged in as that user (admin/service role)

create or replace function increment_points(row_id uuid, amount int)
returns void
language plpgsql
security definer
as $$
declare
  v_today_points int;
  v_last_earned date;
begin
  -- Check if record exists
  if not exists (select 1 from users_points where user_id = row_id) then
    insert into users_points (user_id, total_points, weekly_points, monthly_points, today_points, last_earned_date)
    values (row_id, amount, amount, amount, amount, current_date);
  else
    select today_points, last_earned_date into v_today_points, v_last_earned 
    from users_points 
    where user_id = row_id;
    
    -- Reset daily points if needed (new day)
    if v_last_earned is null or v_last_earned < current_date then
      v_today_points := 0;
    end if;

    update users_points
    set
      total_points = coalesce(total_points, 0) + amount,
      weekly_points = coalesce(weekly_points, 0) + amount,
      monthly_points = coalesce(monthly_points, 0) + amount,
      today_points = v_today_points + amount,
      last_earned_date = current_date
    where user_id = row_id;
  end if;
end;
$$;
