import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { guardDebugRoute } from '@/lib/debug-gate';

export async function GET(request: Request) {
  const blocked = guardDebugRoute(request);
  if (blocked) return blocked;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        full_name,
        users_points (
          total_points,
          weekly_points,
          badges,
          level
        )
      `)
      .or('full_name.ilike.%Sara%,full_name.ilike.%Husnain%');

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
