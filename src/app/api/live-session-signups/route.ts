import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const age = Number(body?.age);
    const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Please enter a valid name.' }, { status: 400 });
    }
    if (!Number.isInteger(age) || age < 1 || age > 17) {
      return NextResponse.json({ error: 'Please enter an age from 1 to 17.' }, { status: 400 });
    }
    if (phoneNumber.replace(/\D/g, '').length < 7 || phoneNumber.length > 40) {
      return NextResponse.json({ error: 'Please enter a valid WhatsApp number.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('live_session_signups')
      .insert({ child_name: name, child_age: age, phone_number: phoneNumber })
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Live session signup error:', error);
    return NextResponse.json({ error: 'Could not save the live session signup.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (request.headers.get('x-admin-auth') !== 'true') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error, count } = await supabaseAdmin
    .from('live_session_signups')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signups: data || [], total: count ?? 0 });
}