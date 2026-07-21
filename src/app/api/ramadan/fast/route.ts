import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';
import { getActiveRamadanPeriod, toDateKey } from '@/lib/ramadan-mode';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const period = getActiveRamadanPeriod();
    if (!period) {
      return NextResponse.json({ error: 'Ramadan mode is not active right now.' }, { status: 400 });
    }

    const dateKey = String(body?.date || toDateKey()).slice(0, 10);
    if (dateKey < period.start || dateKey > period.end) {
      return NextResponse.json({ error: 'Date must be within the current Ramadan period.' }, { status: 400 });
    }

    const action = String(body?.action || 'log');

    if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('ramadan_fast_logs')
        .delete()
        .eq('user_id', auth.userId)
        .eq('fast_date', dateKey);

      if (error && error.code !== '42P01') throw error;
      return NextResponse.json({ success: true, logged: false, date: dateKey });
    }

    const { error } = await supabaseAdmin.from('ramadan_fast_logs').upsert(
      {
        user_id: auth.userId,
        fast_date: dateKey,
        noted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,fast_date' }
    );

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Run supabase/migrations/20260709_ramadan_mode.sql in Supabase first.' },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, logged: true, date: dateKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
