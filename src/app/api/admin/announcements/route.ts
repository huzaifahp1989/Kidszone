import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('site_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ announcements: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { text, bg_color, active } = body as { text: string; bg_color: string; active?: boolean };
    if (!text || !bg_color) {
      return NextResponse.json({ error: 'text and bg_color are required' }, { status: 400 });
    }
    const { data: inserted, error } = await supabaseAdmin
      .from('site_announcements')
      .insert({ text, bg_color, active: !!active })
      .select()
      .single();
    if (error) throw error;

    if (active) {
      await supabaseAdmin
        .from('site_announcements')
        .update({ active: false })
        .neq('id', inserted.id);
    }
    return NextResponse.json({ announcement: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, active } = body as { id: string; active: boolean };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (active) {
      await supabaseAdmin.from('site_announcements').update({ active: false }).neq('id', id);
    }
    const { data, error } = await supabaseAdmin
      .from('site_announcements')
      .update({ active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ announcement: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
