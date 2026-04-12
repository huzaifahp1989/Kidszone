-- Find users matching 'Sara' or 'Husnain' to get their stats
SELECT 
    p.full_name, 
    up.total_points, 
    up.weekly_points, 
    up.badges, 
    up.level
FROM public.profiles p
JOIN public.users_points up ON p.id = up.user_id
WHERE p.full_name ILIKE '%Sara%' OR p.full_name ILIKE '%Husnain%';
