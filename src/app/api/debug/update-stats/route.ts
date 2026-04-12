import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase environment variables' },
        { status: 500 }
      );
    }
    const supabaseAdmin = createClient(url, key);

    const updates = [
      { name: 'Sara', points: 388, badges: 3 },
      { name: 'Husnain', points: 243, badges: 2 }
    ];

    const results = [];

    for (const update of updates) {
      const { data: users, error: searchError } = await supabaseAdmin
        .from('users')
        .select('uid, name, points, weeklypoints, badges, level')
        .ilike('name', `%${update.name}%`)
        .limit(1);

      if (searchError || !users || users.length === 0) {
        results.push({ name: update.name, status: 'Not Found', error: searchError });
        continue;
      }

      const user = users[0];
      const userId = user.uid;

      const newBadges = (user.badges || 0) + update.badges;
      
      const { error: updateError1 } = await supabaseAdmin
        .from('users')
        .update({
          weeklypoints: (user.weeklypoints || 0) + update.points,
          points: (user.points || 0) + update.points,
          badges: newBadges
        })
        .eq('uid', userId);

      const { data: userPoints, error: pointsError } = await supabaseAdmin
        .from('users_points')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (!pointsError && userPoints) {
          const newBadgesPoints = (userPoints.badges || 0) + update.badges;
          const newLevel = 1 + Math.floor(newBadgesPoints / 5);
          
          await supabaseAdmin
            .from('users_points')
            .update({
                weekly_points: (userPoints.weekly_points || 0) + update.points,
                total_points: (userPoints.total_points || 0) + update.points,
                badges: newBadgesPoints,
                level: newLevel
            })
            .eq('user_id', userId);
      } else if (pointsError && pointsError.code === 'PGRST116') {
           // Create if missing
           const newLevel = 1 + Math.floor(update.badges / 5);
           await supabaseAdmin
            .from('users_points')
            .insert({
                user_id: userId,
                weekly_points: update.points,
                total_points: update.points,
                badges: update.badges,
                level: newLevel
            });
      }

      results.push({ 
        name: update.name, 
        status: 'Updated', 
        old: {
            weekly: user.weeklypoints,
            badges: user.badges
        },
        added: update
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
