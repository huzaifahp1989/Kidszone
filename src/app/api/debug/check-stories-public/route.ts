import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardDebugRoute } from '@/lib/debug-gate';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const blocked = guardDebugRoute(request);
  if (blocked) return blocked;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { success: false, error: 'Missing Supabase environment variables' },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, is_active')
      .limit(10);

    return NextResponse.json({ 
        success: !error, 
        error: error?.message,
        data 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
