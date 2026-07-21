import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidUsername, normalizeUsername } from '@/lib/family-accounts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('username') || '';
    const username = normalizeUsername(raw);

    if (!username) {
      return NextResponse.json({ available: false, error: 'Username is required.' }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          available: false,
          error: 'Username must be 3–20 characters and use only letters, numbers, or underscores.',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      if (error.code === '42703') {
        return NextResponse.json(
          { available: false, error: 'Username column missing. Run SETUP_FAMILY_USERNAMES.sql in Supabase.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ available: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ available: !data?.uid, username });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ available: false, error: message }, { status: 500 });
  }
}
