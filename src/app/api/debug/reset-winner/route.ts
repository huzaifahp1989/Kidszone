import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    // 1. Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ 
            success: false, 
            message: 'Missing SUPABASE_SERVICE_ROLE_KEY. Cannot delete winner securely.' 
        }, { status: 403 });
    }

    // 2. Delete the current week's winner
    // We can delete by date or just the latest one.
    // Let's delete for the current week to be safe.
    
    // Note: We need to match the logic of how we defined "current week" in the SQL.
    // It uses date_trunc('week', CURRENT_DATE).
    // In JS, let's just delete the records created recently or all of them if it's test data?
    // Let's try to delete where week_start_date is recent.
    
    const { error } = await supabaseAdmin
      .from('weekly_winners')
      .delete()
      .gte('week_start_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Winner reset successfully' });
  } catch (error: any) {
    console.error('Reset winner error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
