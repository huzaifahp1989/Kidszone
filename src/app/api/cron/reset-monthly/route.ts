import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authorizeCron } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabaseAdmin.rpc('reset_monthly_leaderboard');

    if (error) {
      if (error.code === 'PGRST202') {
        const { error: updateError } = await supabaseAdmin
          .from('users_points')
          .update({ monthly_points: 0 } as any)
          .neq('monthly_points', 0);

        if (updateError) throw updateError;

        await supabaseAdmin
          .from('users')
          .update({ monthlypoints: 0 } as any)
          .neq('monthlypoints', 0);
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly points reset successfully',
    });
  } catch (error: any) {
    console.error('Monthly reset error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
