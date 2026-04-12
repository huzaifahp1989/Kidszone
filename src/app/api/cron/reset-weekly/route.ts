import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify authorization (simple key check)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Archive the winner (Optional: You might want to do this before resetting)
    // For now, we assume the winner has already been picked/notified via the 'generate_weekly_winner' function
    // which runs on Fridays. This reset happens on Saturday.

    // 2. Call the reset RPC function
    const { error } = await supabaseAdmin.rpc('reset_weekly_leaderboard');

    if (error) {
      // If RPC fails (e.g. function not found), try direct update fallback
      if (error.code === 'PGRST202') {
         console.warn('RPC reset_weekly_leaderboard not found. Attempting direct update...');
         
         const { error: updateError } = await supabaseAdmin
            .from('users_points')
            .update({ weekly_points: 0 } as any)
            .neq('weekly_points', 0); // Only update rows that have points
            
         if (updateError) throw updateError;
         
         // Also update users table
         await supabaseAdmin
            .from('users')
            .update({ weekly_points: 0 } as any)
            .neq('weekly_points', 0);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Weekly leaderboard reset successfully' 
    });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
