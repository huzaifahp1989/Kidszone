-- 1. Add badges and level columns to users_points
ALTER TABLE users_points ADD COLUMN IF NOT EXISTS badges INTEGER DEFAULT 0;
ALTER TABLE users_points ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Update award_points function to calculate badges and levels
CREATE OR REPLACE FUNCTION award_points(p_points INTEGER)
RETURNS jsonb
AS $$
DECLARE
  v_user_id UUID;
  v_today_points INTEGER;
  v_total_points INTEGER;
  v_weekly_points INTEGER;
  v_monthly_points INTEGER;
  v_last_earned DATE;
  v_points_awarded INTEGER;
  v_new_total INTEGER;
  v_new_badges INTEGER;
  v_new_level INTEGER;
  v_badges_earned INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get current points info
  SELECT today_points, total_points, weekly_points, monthly_points, last_earned_date
  INTO v_today_points, v_total_points, v_weekly_points, v_monthly_points, v_last_earned
  FROM users_points
  WHERE user_id = v_user_id;
  
  -- Handle case where user row might not exist
  IF v_today_points IS NULL THEN
    v_today_points := 0;
    v_total_points := 0;
    v_weekly_points := 0;
    v_monthly_points := 0;
  END IF;

  -- Reset daily points if new day
  IF v_last_earned IS NULL OR v_last_earned < CURRENT_DATE THEN
    v_today_points := 0;
  END IF;
  
  -- Calculate how many points can be awarded (max 100/day)
  v_points_awarded := LEAST(p_points, 100 - v_today_points);
  
  -- Award points if within daily limit
  IF v_points_awarded > 0 THEN
    v_new_total := v_total_points + v_points_awarded;
    
    -- Calculate badges: 1 badge for every 100 points
    v_new_badges := FLOOR(v_new_total / 100);
    
    -- Calculate level: Upgrade every 5 badges
    v_new_level := 1 + FLOOR(v_new_badges / 5);

    UPDATE users_points
    SET 
      total_points = v_new_total,
      today_points = v_today_points + v_points_awarded,
      weekly_points = v_weekly_points + v_points_awarded,
      monthly_points = v_monthly_points + v_points_awarded,
      badges = v_new_badges,
      level = v_new_level,
      last_earned_date = CURRENT_DATE
    WHERE user_id = v_user_id;
    
    v_badges_earned := v_new_badges - FLOOR(v_total_points / 100);
  ELSE
    v_new_total := v_total_points;
    v_new_badges := FLOOR(v_total_points / 100);
    v_new_level := 1 + FLOOR(v_new_badges / 5);
    v_badges_earned := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points_awarded,
    'total_points', v_new_total,
    'today_points', v_today_points + v_points_awarded,
    'weekly_points', v_weekly_points + v_points_awarded,
    'monthly_points', v_monthly_points + v_points_awarded,
    'badges', v_new_badges,
    'badges_earned_now', v_badges_earned,
    'level', v_new_level,
    'reason', CASE 
      WHEN v_points_awarded = 0 THEN 'Daily limit reached'
      ELSE ''
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create table for weekly winners
CREATE TABLE IF NOT EXISTS weekly_winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start_date DATE DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL,
  weekly_points INTEGER,
  total_points INTEGER,
  badges INTEGER,
  level INTEGER,
  prize_tier TEXT, -- 'runner', 'winner'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Function to generate and store a weekly winner
CREATE OR REPLACE FUNCTION generate_weekly_winner()
RETURNS jsonb
AS $$
DECLARE
  v_winner RECORD;
  v_existing_id UUID;
BEGIN
  -- Select one random winner from top 20 weekly scorers
  WITH TopUsers AS (
    SELECT user_id, total_points, weekly_points, badges, level
    FROM users_points
    WHERE weekly_points > 0
    ORDER BY weekly_points DESC, badges DESC
    LIMIT 20
  )
  SELECT * INTO v_winner FROM TopUsers ORDER BY RANDOM() LIMIT 1;
  
  IF v_winner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eligible users found');
  END IF;

  -- Insert into history
  INSERT INTO weekly_winners (user_id, weekly_points, total_points, badges, level, prize_tier)
  VALUES (v_winner.user_id, v_winner.weekly_points, v_winner.total_points, v_winner.badges, v_winner.level, 'winner')
  RETURNING id INTO v_existing_id;

  RETURN jsonb_build_object(
    'success', true,
    'winner_id', v_winner.user_id,
    'weekly_points', v_winner.weekly_points,
    'badges', v_winner.badges,
    'level', v_winner.level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
