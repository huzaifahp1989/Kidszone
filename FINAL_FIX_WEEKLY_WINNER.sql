-- FINAL FIX FOR WEEKLY WINNER SYSTEM
-- Run this in Supabase SQL Editor to fix "column does not exist" errors.

-- 1. Fix the Table Structure (Add missing columns safely)
DO $$ 
BEGIN 
    -- Add week_start_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'week_start_date') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN week_start_date DATE DEFAULT CURRENT_DATE;
        -- Add a unique constraint if it doesn't exist
        BEGIN
            ALTER TABLE public.weekly_winners ADD CONSTRAINT weekly_winners_week_start_date_key UNIQUE (week_start_date);
        EXCEPTION WHEN duplicate_table THEN 
            -- Constraint already exists
        END;
    END IF;

    -- Add week_end_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'week_end_date') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN week_end_date DATE DEFAULT (CURRENT_DATE + 6);
    END IF;

    -- Add notified if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'notified') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN notified BOOLEAN DEFAULT FALSE;
    END IF;

    -- Standardize user_id column name
    -- We want 'winner_user_id'. If we have 'user_id', rename it.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'user_id') THEN
        ALTER TABLE public.weekly_winners RENAME COLUMN user_id TO winner_user_id;
    END IF;
    -- If neither exists, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'winner_user_id') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN winner_user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Standardize score column name
    -- We want 'winning_score'. If we have 'weekly_points', rename it.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'weekly_points') THEN
        ALTER TABLE public.weekly_winners RENAME COLUMN weekly_points TO winning_score;
    END IF;
    -- If neither exists, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'winning_score') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN winning_score INTEGER DEFAULT 0;
    END IF;
    
    -- Ensure prize_tier exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_winners' AND column_name = 'prize_tier') THEN
        ALTER TABLE public.weekly_winners ADD COLUMN prize_tier TEXT;
    END IF;

END $$;

-- 2. Fix Permissions
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view weekly winners" ON public.weekly_winners;
CREATE POLICY "Anyone can view weekly winners" ON public.weekly_winners FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role can manage weekly winners" ON public.weekly_winners;
CREATE POLICY "Service role can manage weekly winners" ON public.weekly_winners FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.weekly_winners TO service_role;
GRANT SELECT ON public.weekly_winners TO authenticated, anon;
GRANT ALL ON public.weekly_winners TO postgres;

-- 3. Update the Generator Function to match the fixed table structure
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
    SELECT count(*) INTO v_count FROM public.users_points WHERE weekly_points > 100;
    
    IF v_count = 0 THEN
         RETURN jsonb_build_object(
            'success', false, 
            'is_new', false,
            'message', 'No eligible players found (0 players with weekly_points > 100)'
        );
    END IF;

    -- Select a winner randomly from top 20 scorers of the week
    SELECT user_id, weekly_points, badges, level
    INTO v_winner_id, v_winning_score, v_badges, v_level
    FROM public.users_points
    WHERE weekly_points > 100
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

    -- Insert winner record using the CORRECT column names
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

-- 4. Update the Getter Function to match the fixed table structure
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
