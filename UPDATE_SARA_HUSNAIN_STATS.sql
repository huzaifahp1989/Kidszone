-- Update Sara's and Husnain's stats
-- Adding 388 points and 3 badges to Sara
-- Adding 243 points and 2 badges to Husnain

DO $$
DECLARE
    v_sara_id UUID;
    v_husnain_id UUID;
BEGIN
    -- Find Sara
    SELECT uid INTO v_sara_id FROM public.users WHERE name ILIKE '%Sara%' LIMIT 1;
    
    IF v_sara_id IS NOT NULL THEN
        -- Update users table
        UPDATE public.users 
        SET 
            weeklypoints = COALESCE(weeklypoints, 0) + 388,
            points = COALESCE(points, 0) + 388,
            badges = COALESCE(badges, 0) + 3
        WHERE uid = v_sara_id;
        
        -- Try to update users_points if it exists
        BEGIN
            INSERT INTO public.users_points (user_id, weekly_points, total_points, badges, level)
            VALUES (v_sara_id, 388, 388, 3, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                weekly_points = users_points.weekly_points + 388,
                total_points = users_points.total_points + 388,
                badges = users_points.badges + 3,
                level = 1 + FLOOR((users_points.badges + 3) / 5);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not update users_points for Sara: %', SQLERRM;
        END;
            
        RAISE NOTICE 'Updated Sara';
    ELSE
        RAISE NOTICE 'Sara not found';
    END IF;

    -- Find Husnain
    SELECT uid INTO v_husnain_id FROM public.users WHERE name ILIKE '%Husnain%' LIMIT 1;
    
    IF v_husnain_id IS NOT NULL THEN
        -- Update users table
        UPDATE public.users 
        SET 
            weeklypoints = COALESCE(weeklypoints, 0) + 243,
            points = COALESCE(points, 0) + 243,
            badges = COALESCE(badges, 0) + 2
        WHERE uid = v_husnain_id;

        -- Try to update users_points
        BEGIN
            INSERT INTO public.users_points (user_id, weekly_points, total_points, badges, level)
            VALUES (v_husnain_id, 243, 243, 2, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                weekly_points = users_points.weekly_points + 243,
                total_points = users_points.total_points + 243,
                badges = users_points.badges + 2,
                level = 1 + FLOOR((users_points.badges + 2) / 5);
        EXCEPTION WHEN OTHERS THEN
             RAISE NOTICE 'Could not update users_points for Husnain: %', SQLERRM;
        END;

        RAISE NOTICE 'Updated Husnain';
    ELSE
        RAISE NOTICE 'Husnain not found';
    END IF;
END $$;
