import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { guardDebugRoute } from '@/lib/debug-gate';

export async function GET(request: Request) {
  const blocked = guardDebugRoute(request);
  if (blocked) return blocked;

  try {
    console.log('Debug: Fetching users...');
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);

    if (error) {
        console.error('Debug: Supabase error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }

    console.log('Debug: Users found:', users?.length);
    return NextResponse.json({ 
        count: users?.length, 
        users: users,
        env_check: {
            has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
  } catch (err: any) {
    console.error('Debug: Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
