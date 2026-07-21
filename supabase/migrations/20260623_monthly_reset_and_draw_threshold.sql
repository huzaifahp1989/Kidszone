-- Monthly points reset + weekly winner draw threshold (150 points)

    CREATE OR REPLACE FUNCTION public.reset_monthly_leaderboard()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
    UPDATE public.users_points
    SET monthly_points = 0
    WHERE COALESCE(monthly_points, 0) <> 0;

    UPDATE public.users
    SET monthlypoints = 0
    WHERE COALESCE(monthlypoints, 0) <> 0;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.reset_monthly_leaderboard() TO service_role;

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
        v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
        v_week_end := v_week_start + 6;

        SELECT id INTO v_existing_winner FROM public.weekly_winners WHERE week_start_date = v_week_start;

        IF v_existing_winner IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_new', false,
                'message', 'Winner already selected for this week',
                'winner_id', v_existing_winner
            );
        END IF;

        SELECT count(*) INTO v_count FROM public.users_points WHERE weekly_points > 150;

        IF v_count = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'is_new', false,
                'message', 'No eligible players found (0 players with weekly_points > 150)'
            );
        END IF;

        SELECT user_id, weekly_points, badges, level
        INTO v_winner_id, v_winning_score, v_badges, v_level
        FROM public.users_points
        WHERE weekly_points > 150
        ORDER BY last_earned_date DESC NULLS LAST, weekly_points DESC
        LIMIT 1
        OFFSET floor(random() * LEAST(v_count, 20));

        IF v_winner_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'is_new', false,
                'message', 'Failed to select a winner despite having eligible players'
            );
        END IF;

        IF v_level >= 10 THEN v_prize_tier := 'Grand Master Prize';
        ELSIF v_level >= 5 THEN v_prize_tier := 'Advanced Scholar Prize';
        ELSE v_prize_tier := 'Junior Explorer Prize';
        END IF;

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
            'message', SQLERRM
        );
    END;
    $$;
