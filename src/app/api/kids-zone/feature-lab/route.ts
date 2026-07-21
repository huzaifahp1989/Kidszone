import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';

type FeatureLabRow = {
  user_id: string;
  date: string;
  good_deeds: string[] | null;
  challenge_roll: number | null;
  challenge_id: string | null;
};

function sanitizeGoodDeeds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const items = input
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  return Array.from(new Set(items));
}

function normalizeDate(input: string | null): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date().toISOString().slice(0, 10);
  }
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const date = normalizeDate(searchParams.get('date'));

    const { data, error } = await supabaseAdmin
      .from('kids_zone_feature_progress')
      .select('user_id, date, good_deeds, challenge_roll, challenge_id')
      .eq('user_id', auth.userId)
      .eq('date', date)
      .maybeSingle<FeatureLabRow>();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        goodDeeds: data?.good_deeds || [],
        challengeRoll: Number(data?.challenge_roll || 0),
        challengeId: data?.challenge_id || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const date = normalizeDate(body?.date ? String(body.date) : null);
    const goodDeeds = sanitizeGoodDeeds(body?.goodDeeds);
    const challengeRoll = Math.max(0, Number(body?.challengeRoll || 0));
    const challengeId = body?.challengeId ? String(body.challengeId).slice(0, 120) : null;

    const payload = {
      user_id: auth.userId,
      date,
      good_deeds: goodDeeds,
      challenge_roll: challengeRoll,
      challenge_id: challengeId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('kids_zone_feature_progress')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        goodDeeds,
        challengeRoll,
        challengeId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
