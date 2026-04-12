import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('site_announcements')
      .select('id, text, bg_color, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      // If RLS blocks anon, return empty gracefully
      return NextResponse.json({ announcement: null });
    }
    return NextResponse.json({ announcement: data || null });
  } catch (err: any) {
    return NextResponse.json({ announcement: null });
  }
}
