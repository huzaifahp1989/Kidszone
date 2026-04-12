import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { points, publish, feedback } = body;

    // 1. Update recording status
    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({
        status: 'approved',
        points_awarded: points,
        admin_notes: feedback,
        is_published: publish,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Award points to user
    // We fetch the user_id first
    const { data: recording } = await supabaseAdmin
      .from('recordings')
      .select('user_id')
      .eq('id', id)
      .single();

    if (recording && points > 0) {
      // Call the award points logic
      // Since we are in an API route, we can use the logic from points-service directly or via RPC if it existed
      // For now, we'll manually update via supabaseAdmin which bypasses RLS
      
      const userId = recording.user_id;
      
      // Fetch current points
      const { data: userPoints } = await supabaseAdmin
        .from('users_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userPoints) {
        const newTotal = (userPoints.total_points || 0) + points;
        const newWeekly = (userPoints.weekly_points || 0) + points;
        const newMonthly = (userPoints.monthly_points || 0) + points;
        
        await supabaseAdmin
          .from('users_points')
          .update({
            total_points: newTotal,
            weekly_points: newWeekly,
            monthly_points: newMonthly
          })
          .eq('user_id', userId);
          
        // Also update users table copy if needed
         await supabaseAdmin
          .from('users')
          .update({
            points: newTotal,
            weeklypoints: newWeekly,
            monthlypoints: newMonthly
          })
          .eq('uid', userId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
