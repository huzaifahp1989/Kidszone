-- COMPLETE BADGE SYSTEM SETUP AND WEEKLY WINNER LOGIC

-- Ensure weekly_winners table exists
CREATE TABLE IF NOT EXISTS public.weekly_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    winner_user_id UUID REFERENCES auth.users(id),
    winning_score INTEGER,
    prize_tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(week_start_date)
);

-- RLS Policies for weekly_winners
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view weekly winners" ON public.weekly_winners;
CREATE POLICY "Anyone can view weekly winners" 
ON public.weekly_winners FOR SELECT 
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Service role can manage weekly winners" ON public.weekly_winners;
CREATE POLICY "Service role can manage weekly winners" 
ON public.weekly_winners FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Ensure users_points has badges and level columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_points' AND column_name = 'badges') THEN
        ALTER TABLE public.users_points ADD COLUMN badges INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_points' AND column_name = 'level') THEN
        ALTER TABLE public.users_points ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
END $$;

-- Function to generate weekly winner
CREATE OR REPLACE FUNCTION public.generate_weekly_winner()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_week_start DATE;
    v_week_end DATE;
    v_winner_id UUID;
    v_winning_score INTEGER;
    v_existing_winner UUID;
    v_prize_tier TEXT;
    v_badges INTEGER;
    v_level INTEGER;
BEGIN
    -- Calculate current week's Monday (start) and Sunday (end)
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
    v_week_end := v_week_start + 6;

    -- Check if winner already exists for this week
    SELECT id INTO v_existing_winner FROM public.weekly_winners WHERE week_start_date = v_week_start;
    
    IF v_existing_winner IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true, 
            'is_new', false,
            'message', 'Winner already selected for this week',
            'winner_id', v_existing_winner
        );
    END IF;

    -- Select a winner randomly from top 20 scorers of the week
    SELECT user_id, weekly_points, badges, level
    INTO v_winner_id, v_winning_score, v_badges, v_level
    FROM public.users_points
    WHERE weekly_points > 0
    ORDER BY weekly_points DESC
    LIMIT 1
    OFFSET floor(random() * LEAST((SELECT count(*) FROM public.users_points WHERE weekly_points > 0), 20));

    IF v_winner_id IS NULL THEN
         RETURN jsonb_build_object(
            'success', false, 
            'is_new', false,
            'message', 'No eligible players found for this week'
        );
    END IF;

    -- Determine prize tier based on level
    IF v_level >= 10 THEN v_prize_tier := 'Grand Master Prize';
    ELSIF v_level >= 5 THEN v_prize_tier := 'Advanced Scholar Prize';
    ELSE v_prize_tier := 'Junior Explorer Prize';
    END IF;

    -- Insert winner record
    INSERT INTO public.weekly_winners (week_start_date, week_end_date, winner_user_id, winning_score, prize_tier)
    VALUES (v_week_start, v_week_end, v_winner_id, v_winning_score, v_prize_tier);

    RETURN jsonb_build_object(
        'success', true,
        'is_new', true,
        'winner_id', v_winner_id,
        'score', v_winning_score,
        'prize', v_prize_tier
    );
END;
$$;

-- Helper function to get current weekly winner details
CREATE OR REPLACE FUNCTION public.get_current_weekly_winner()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_winner_record RECORD;
    v_user_details RECORD;
BEGIN
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

    SELECT * INTO v_winner_record 
    FROM public.weekly_winners 
    WHERE week_start_date = v_week_start;

    IF v_winner_record IS NULL THEN
        -- Try previous week if current week has no winner yet (e.g., it's Monday-Thursday)
        SELECT * INTO v_winner_record 
        FROM public.weekly_winners 
        WHERE week_start_date = v_week_start - 7;
    END IF;

    IF v_winner_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get user details (badges, level)
    SELECT badges, level INTO v_user_details
    FROM public.users_points
    WHERE user_id = v_winner_record.winner_user_id;

    RETURN jsonb_build_object(
        'name', 'Champion', -- Placeholder
        'weekly_points', v_winner_record.winning_score,
        'badges', COALESCE(v_user_details.badges, 0),
        'level', COALESCE(v_user_details.level, 1),
        'prize_tier', v_winner_record.prize_tier
    );
END;
$$;


-- Updated Award Points Function with Badge and Level Logic
CREATE OR REPLACE FUNCTION public.award_points(p_points INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_today_points INTEGER;
    v_total_points INTEGER;
    v_weekly_points INTEGER;
    v_monthly_points INTEGER;
    v_badges INTEGER;
    v_level INTEGER;
    v_last_earned_date DATE;
    v_new_badges INTEGER;
    v_points_to_award INTEGER;
    v_daily_limit CONSTANT INTEGER := 100;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not authenticated');
    END IF;

    -- Get current stats
    SELECT 
        COALESCE(today_points, 0),
        COALESCE(total_points, 0),
        COALESCE(weekly_points, 0),
        COALESCE(monthly_points, 0),
        COALESCE(badges, 0),
        COALESCE(level, 1),
        last_earned_date
    INTO 
        v_today_points,
        v_total_points,
        v_weekly_points,
        v_monthly_points,
        v_badges,
        v_level,
        v_last_earned_date
    FROM public.users_points
    WHERE user_id = v_user_id;

    -- Initialize if no record
    IF NOT FOUND THEN
        v_today_points := 0;
        v_total_points := 0;
        v_weekly_points := 0;
        v_monthly_points := 0;
        v_badges := 0;
        v_level := 1;
        v_last_earned_date := CURRENT_DATE - 1; -- Force reset
    END IF;

    -- Check daily reset
    IF v_last_earned_date IS NULL OR v_last_earned_date < CURRENT_DATE THEN
        v_today_points := 0;
    END IF;

    -- Check limit
    IF v_today_points >= v_daily_limit THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Daily limit reached',
            'today_points', v_today_points,
            'daily_limit', v_daily_limit
        );
    END IF;

    -- Calculate points to award (cap at limit)
    v_points_to_award := LEAST(p_points, v_daily_limit - v_today_points);

    -- Update counters
    v_today_points := v_today_points + v_points_to_award;
    v_total_points := v_total_points + v_points_to_award;
    v_weekly_points := v_weekly_points + v_points_to_award;
    v_monthly_points := v_monthly_points + v_points_to_award;

    -- Calculate Badges (1 badge per 100 points total)
    DECLARE
        v_new_total_badges INTEGER;
    BEGIN
        v_new_total_badges := FLOOR(v_total_points / 100);
        v_new_badges := GREATEST(0, v_new_total_badges - v_badges);
        v_badges := v_new_total_badges;
    END;

    -- Calculate Level (1 level per 5 badges)
    v_level := 1 + FLOOR(v_badges / 5);

    -- Update Table
    INSERT INTO public.users_points (
        user_id, total_points, weekly_points, monthly_points, today_points, badges, level, last_earned_date
    ) VALUES (
        v_user_id, v_total_points, v_weekly_points, v_monthly_points, v_today_points, v_badges, v_level, CURRENT_DATE
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        weekly_points = EXCLUDED.weekly_points,
        monthly_points = EXCLUDED.monthly_points,
        today_points = EXCLUDED.today_points,
        badges = EXCLUDED.badges,
        level = EXCLUDED.level,
        last_earned_date = EXCLUDED.last_earned_date;

    RETURN jsonb_build_object(
        'success', true,
        'points_awarded', v_points_to_award,
        'total_points', v_total_points,
        'today_points', v_today_points,
        'weekly_points', v_weekly_points,
        'monthly_points', v_monthly_points,
        'badges', v_badges,
        'level', v_level,
        'badges_earned_now', v_new_badges,
        'daily_limit', v_daily_limit
    );
END;
$$;

-- Backfill Badges and Levels for ALL users
UPDATE public.users_points
SET 
  badges = FLOOR(total_points / 100),
  level = 1 + FLOOR(FLOOR(total_points / 100) / 5);
