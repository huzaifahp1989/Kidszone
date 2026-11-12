import { NextResponse } from 'next/server';
import { isAdminSessionRequest } from '@/lib/admin-session';
import { isMissingTableError } from '@/lib/challenge-quiz-server';
import { validateMonthlyWinnerInput, type MonthlyWinnerInput } from '@/lib/monthly-winners';
import { deleteObject } from '@/lib/object-storage';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ADMIN_WINNER_FIELDS =
  'id, month_key, first_name, age_bracket, city, user_id, parent_guardian_consent, is_published, created_at, photo_url, photo_path';

const MAX_BULK_WINNERS = 100;

type WinnerRow = {
  month_key: string;
  first_name: string;
  age_bracket: string;
  city: string;
  user_id: string | null;
  parent_guardian_consent: boolean;
  is_published: boolean;
  photo_url: string | null;
  photo_path: string | null;
};

function toRow(winner: MonthlyWinnerInput): WinnerRow {
  return {
    month_key: winner.monthKey,
    first_name: winner.firstName,
    age_bracket: winner.ageBracket,
    city: winner.city,
    user_id: winner.userId ?? null,
    parent_guardian_consent: winner.parentGuardianConsent,
    is_published: winner.isPublished,
    photo_url: winner.photoUrl ?? null,
    photo_path: winner.photoPath ?? null,
  };
}

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

  const record = (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>;

  // Bulk add: one request carrying many winners (used by the "add in one go" flow).
  if (Array.isArray(record.winners)) {
    const items = record.winners as unknown[];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one winner.' }, { status: 400 });
    }
    if (items.length > MAX_BULK_WINNERS) {
      return NextResponse.json({ error: `Add up to ${MAX_BULK_WINNERS} winners at a time.` }, { status: 400 });
    }

    const rows: WinnerRow[] = [];
    const errors: string[] = [];
    items.forEach((item, index) => {
      const validation = validateMonthlyWinnerInput(item);
      if (!validation.ok) {
        errors.push(`Row ${index + 1}: ${validation.error}`);
        return;
      }
      rows.push(toRow(validation.winner));
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: errors[0] || 'No valid winners to add.', errors },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_public_winners')
      .insert(rows)
      .select(ADMIN_WINNER_FIELDS);

    if (error && isMissingTableError(error)) {
      return NextResponse.json({ error: 'Run the monthly winners migration before adding winners.' }, { status: 503 });
    }
    if (error) {
      console.error('[admin/monthly-winners] Could not add winners:', error.message);
      return NextResponse.json({ error: 'Could not add monthly winners.' }, { status: 500 });
    }

    return NextResponse.json(
      { winners: data || [], added: data?.length ?? 0, skipped: errors.length, errors },
      { status: 201 }
    );
  }

  const validation = validateMonthlyWinnerInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('monthly_public_winners')
    .insert(toRow(validation.winner))
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

  const update: Record<string, unknown> = {};
  if (input.parentGuardianConsent === false) {
    update.parent_guardian_consent = false;
    update.is_published = false;
  } else if (typeof input.isPublished === 'boolean') {
    update.is_published = input.isPublished;
  }

  // Photo set / replace / clear.
  let nextPhotoPath: string | null = null;
  let photoChanged = false;
  if (input.photoUrl === null || input.photoPath === null) {
    update.photo_url = null;
    update.photo_path = null;
    photoChanged = true;
  } else if (typeof input.photoUrl === 'string' && input.photoUrl.trim()) {
    const url = input.photoUrl.trim();
    if (url.length > 500 || /[\r\n]/.test(url)) {
      return NextResponse.json({ error: 'That photo link is not valid.' }, { status: 400 });
    }
    nextPhotoPath =
      typeof input.photoPath === 'string' && input.photoPath.trim()
        ? input.photoPath.trim().slice(0, 300)
        : null;
    update.photo_url = url;
    update.photo_path = nextPhotoPath;
    photoChanged = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Choose a valid winner update.' }, { status: 400 });
  }

  let previousPath: string | null = null;
  if (photoChanged) {
    const { data: existing } = await supabaseAdmin
      .from('monthly_public_winners')
      .select('photo_path')
      .eq('id', id)
      .maybeSingle();
    previousPath = (existing as { photo_path: string | null } | null)?.photo_path ?? null;
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

  if (previousPath && previousPath !== nextPhotoPath) {
    try {
      await deleteObject('voucher-assets', previousPath);
    } catch (cleanupError) {
      console.error('[admin/monthly-winners] Could not delete replaced photo:', cleanupError);
    }
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
    .select('id, photo_path')
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

  const photoPath = (data as { photo_path: string | null }).photo_path;
  if (photoPath) {
    try {
      await deleteObject('voucher-assets', photoPath);
    } catch (cleanupError) {
      console.error('[admin/monthly-winners] Could not delete winner photo:', cleanupError);
    }
  }

  return NextResponse.json({ ok: true });
}
