-- ============================================================================
-- AUTO WEEKLY WINNER & NOTIFICATION SETUP
-- ============================================================================
-- 1. Updates generate_weekly_winner to be idempotent (safe to call repeatedly)
-- 2. Adds notification tracking
-- 3. Adds logic to fetch winner details
-- ============================================================================

-- 1. Add notification tracking to weekly_winners
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'notified') THEN
        ALTER TABLE weekly_winners ADD COLUMN notified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update generate_weekly_winner to prevent duplicates for the same week
CREATE OR REPLACE FUNCTION generate_weekly_winner()
RETURNS jsonb
AS $$
DECLARE
  v_winner RECORD;
  v_existing_id UUID;
  v_week_start DATE;
BEGIN
  -- Define "This Week" as starting from the most recent Monday (or just use current date if simpler)
  -- For simplicity, we'll check if a winner exists for "this week" defined by ISO week number
  -- OR simpler: check if a record exists with week_start_date > 6 days ago
  
  -- Using CURRENT_DATE as the "start date" for the record for simplicity
  v_week_start := CURRENT_DATE;

  -- Check if we already have a winner for this week (last 6 days)
  SELECT id INTO v_existing_id 
  FROM weekly_winners 
  WHERE created_at > (NOW() - INTERVAL '6 days')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
     -- Return existing winner
     SELECT * INTO v_winner FROM weekly_winners WHERE id = v_existing_id;
     RETURN jsonb_build_object(
        'success', true,
        'message', 'Winner already exists for this week',
        'winner_id', v_winner.user_id,
        'weekly_points', v_winner.weekly_points,
        'badges', v_winner.badges,
        'level', v_winner.level,
        'is_new', false
     );
  END IF;

  -- Select one random winner from top 20 weekly scorers
  -- Added condition: Must have > 0 points
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
  INSERT INTO weekly_winners (
    user_id, 
    weekly_points, 
    total_points, 
    badges, 
    level, 
    prize_tier, 
    week_start_date
  )
  VALUES (
    v_winner.user_id, 
    v_winner.weekly_points, 
    v_winner.total_points, 
    v_winner.badges, 
    v_winner.level, 
    'winner',
    v_week_start
  )
  RETURNING id INTO v_existing_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'New winner generated',
    'winner_id', v_winner.user_id,
    'weekly_points', v_winner.weekly_points,
    'badges', v_winner.badges,
    'level', v_winner.level,
    'is_new', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a view or function to get the latest winner with user details
CREATE OR REPLACE FUNCTION get_current_weekly_winner()
RETURNS jsonb
AS $$
DECLARE
  v_winner RECORD;
  v_user_name TEXT;
BEGIN
  -- Get the most recent winner
  SELECT * INTO v_winner 
  FROM weekly_winners 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_winner IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get user name
  SELECT name INTO v_user_name FROM users WHERE uid = v_winner.user_id;

  RETURN jsonb_build_object(
    'user_id', v_winner.user_id,
    'name', COALESCE(v_user_name, 'Unknown Scholar'),
    'weekly_points', v_winner.weekly_points,
    'badges', v_winner.badges,
    'level', v_winner.level,
    'week_date', v_winner.week_start_date,
    'prize_tier', v_winner.prize_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant access to these functions
GRANT EXECUTE ON FUNCTION get_current_weekly_winner() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_weekly_winner() TO anon;
GRANT EXECUTE ON FUNCTION generate_weekly_winner() TO authenticated; -- Protected, but callable by client logic if needed (or restricted to service role)
