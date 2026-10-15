import { NextResponse } from 'next/server';
import { isAdminSessionRequest } from '@/lib/admin-session';
import { isMissingTableError } from '@/lib/challenge-quiz-server';
import { validateMonthlyWinnerInput } from '@/lib/monthly-winners';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ADMIN_WINNER_FIELDS =
  'id, month_key, first_name, age_bracket, city, parent_guardian_consent, is_published, created_at';

export async function GET(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to manage winners.' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .select(ADMIN_WINNER_FIELDS)
    .order('month_key', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error && isMissingTableError(error)) {
    return NextResponse.json({ error: 'Run the monthly winners migration before managing winners.' }, { status: 503 });
  }
  if (error) {
    console.error('[admin/monthly-winners] Could not load winners:', error.message);
    return NextResponse.json({ error: 'Could not load monthly winners.' }, { status: 500 });
  }

  return NextResponse.json(
    { winners: data || [] },
    { headers: { 'Cache-Control': 'no-store, private' } }
  );
}

export async function POST(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to manage winners.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter the winner details.' }, { status: 400 });
  }
  const validation = validateMonthlyWinnerInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { winner } = validation;
  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .insert({
      month_key: winner.monthKey,
      first_name: winner.firstName,
      age_bracket: winner.ageBracket,
      city: winner.city,
      parent_guardian_consent: winner.parentGuardianConsent,
      is_published: winner.isPublished,
    })
    .select(ADMIN_WINNER_FIELDS)
    .single();

  if (error && isMissingTableError(error)) {
    return NextResponse.json({ error: 'Run the monthly winners migration before adding winners.' }, { status: 503 });
  }
  if (error) {
    console.error('[admin/monthly-winners] Could not add winner:', error.message);
    return NextResponse.json({ error: 'Could not add monthly winner.' }, { status: 500 });
  }

  return NextResponse.json({ winner: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to manage winners.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Choose a winner and publication status.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Choose a winner and publication status.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Choose a valid winner.' }, { status: 400 });
  }
  const update: { is_published?: boolean; parent_guardian_consent?: boolean } = {};
  if (input.parentGuardianConsent === false) {
    update.parent_guardian_consent = false;
    update.is_published = false;
  } else if (typeof input.isPublished === 'boolean') {
    update.is_published = input.isPublished;
  } else {
    return NextResponse.json({ error: 'Choose a valid winner update.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .update(update)
    .eq('id', id)
    .eq('parent_guardian_consent', true)
    .select(ADMIN_WINNER_FIELDS)
    .maybeSingle();

  if (error && isMissingTableError(error)) {
    return NextResponse.json({ error: 'Run the monthly winners migration before managing winners.' }, { status: 503 });
  }
  if (error) {
    console.error('[admin/monthly-winners] Could not update winner:', error.message);
    return NextResponse.json({ error: 'Could not update monthly winner.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Winner was not found or has already been unpublished.' }, { status: 404 });
  }

  return NextResponse.json({ winner: data });
}

export async function DELETE(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasSupabaseServiceRole()) {
    return NextResponse.json({ error: 'A Supabase service-role key is required to manage winners.' }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Choose a valid winner.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error && isMissingTableError(error)) {
    return NextResponse.json({ error: 'Run the monthly winners migration before managing winners.' }, { status: 503 });
  }
  if (error) {
    console.error('[admin/monthly-winners] Could not delete winner:', error.message);
    return NextResponse.json({ error: 'Could not delete monthly winner.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Winner was not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
