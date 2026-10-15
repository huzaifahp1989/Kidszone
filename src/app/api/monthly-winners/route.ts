import { NextResponse } from 'next/server';
import { isMissingTableError } from '@/lib/challenge-quiz-server';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'Monthly winners are temporarily unavailable.' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .select('id, month_key, first_name, age_bracket, city')
    .eq('parent_guardian_consent', true)
    .eq('is_published', true)
    .order('month_key', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error && isMissingTableError(error)) {
    return NextResponse.json(
      { error: 'Monthly winners are not set up yet. Please contact the site administrator.' },
      { status: 503 }
    );
  }
  if (error) {
    console.error('[monthly-winners] Could not load public winners:', error.message);
    return NextResponse.json({ error: 'Could not load monthly winners.' }, { status: 500 });
  }

  return NextResponse.json(
    { winners: data || [] },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
