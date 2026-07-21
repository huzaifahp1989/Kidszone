import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('hifz_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('surah_number', { ascending: true });

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ progress: [], setupRequired: true });
      }
      throw error;
    }

    return NextResponse.json({ progress: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load hifz progress';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const surahNumber = Number(body?.surahNumber);
    const status = String(body?.status || '').trim();
    const ayahsMemorized = Number(body?.ayahsMemorized ?? 0);
    const notes = body?.notes ? String(body.notes).slice(0, 500) : null;

    if (!surahNumber || !['learning', 'memorized'].includes(status)) {
      return NextResponse.json({ error: 'Invalid surahNumber or status' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('hifz_progress')
      .upsert(
        {
          user_id: user.id,
          surah_number: surahNumber,
          status,
          ayahs_memorized: Math.max(0, ayahsMemorized),
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,surah_number' }
      )
      .select()
      .single();

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Hifz table not set up. Run the migration.', setupRequired: true }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ progress: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save hifz progress';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
