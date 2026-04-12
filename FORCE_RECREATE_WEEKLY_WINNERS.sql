-- FORCE RECREATE WEEKLY WINNERS TABLE
-- This script will DROP the existing table and recreate it to ensure the schema is correct.
-- WARNING: This will delete existing weekly winner records.

-- 1. Drop the table and dependent objects
DROP TABLE IF EXISTS public.weekly_winners CASCADE;

-- 2. Recreate the table with the correct schema
CREATE TABLE public.weekly_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    winner_user_id UUID REFERENCES auth.users(id), -- Added FK for integrity
    winning_score INTEGER,
    prize_tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notified BOOLEAN DEFAULT FALSE,
    UNIQUE(week_start_date)
);

-- 3. Enable RLS
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Policies
CREATE POLICY "Anyone can view weekly winners" 
ON public.weekly_winners FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Service role can manage weekly winners" 
ON public.weekly_winners FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. Grant Permissions
GRANT ALL ON public.weekly_winners TO service_role;
GRANT SELECT ON public.weekly_winners TO authenticated, anon;
GRANT ALL ON public.weekly_winners TO postgres;

-- 6. Recreate the generator function (Schema aligned)
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
    v_count INTEGER;
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

    -- Check if there are any users with points
    SELECT count(*) INTO v_count FROM public.users_points WHERE weekly_points > 0;
    
    IF v_count = 0 THEN
         RETURN jsonb_build_object(
            'success', false, 
            'is_new', false,
            'message', 'No eligible players found (0 players with weekly_points > 0)'
        );
    END IF;

    -- Select a winner randomly from top 20 scorers of the week
    SELECT user_id, weekly_points, badges, level
    INTO v_winner_id, v_winning_score, v_badges, v_level
    FROM public.users_points
    WHERE weekly_points > 0
    ORDER BY weekly_points DESC
    LIMIT 1
    OFFSET floor(random() * LEAST(v_count, 20));

    IF v_winner_id IS NULL THEN
         RETURN jsonb_build_object(
            'success', false, 
            'is_new', false,
            'message', 'Failed to select a winner despite having eligible players'
        );
    END IF;

    -- Determine prize tier based on level
    IF v_level >= 10 THEN v_prize_tier := 'Grand Master Prize';
    ELSIF v_level >= 5 THEN v_prize_tier := 'Advanced Scholar Prize';
    ELSE v_prize_tier := 'Junior Explorer Prize';
    END IF;

    -- Insert winner record
    INSERT INTO public.weekly_winners (week_start_date, week_end_date, winner_user_id, winning_score, prize_tier, notified)
    VALUES (v_week_start, v_week_end, v_winner_id, v_winning_score, v_prize_tier, false);

    RETURN jsonb_build_object(
        'success', true,
        'is_new', true,
        'winner_id', v_winner_id,
        'score', v_winning_score,
        'prize', v_prize_tier
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'is_new', false,
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- 7. Recreate the getter function (Schema aligned)
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
        -- Try previous week
        SELECT * INTO v_winner_record 
        FROM public.weekly_winners 
        WHERE week_start_date = v_week_start - 7;
    END IF;

    IF v_winner_record IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT badges, level INTO v_user_details
    FROM public.users_points
    WHERE user_id = v_winner_record.winner_user_id;

    RETURN jsonb_build_object(
        'name', 'Champion', 
        'weekly_points', v_winner_record.winning_score,
        'badges', COALESCE(v_user_details.badges, 0),
        'level', COALESCE(v_user_details.level, 1),
        'prize_tier', v_winner_record.prize_tier
    );
END;
$$;
