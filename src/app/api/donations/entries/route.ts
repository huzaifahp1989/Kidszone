import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isDonationType, normalizeDonationRow, parseAmountToPence } from '@/lib/donations';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get('from') || '').trim();
    const to = String(searchParams.get('to') || '').trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 30)));

    let query = supabaseAdmin
      .from('kids_donations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ entries: [], setupRequired: true }, { status: 503 });
      }
      throw error;
    }

    const entries = (data || []).map((row) => normalizeDonationRow(row as Record<string, unknown>));
    const totalAmountPence = entries.reduce((sum, entry) => sum + entry.amountPence, 0);

    return NextResponse.json({
      entries,
      summary: {
        count: entries.length,
        totalAmountPence,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load donations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const donationType = String(body?.donationType || '').trim();
    const description = String(body?.description || '').trim();
    const amountPence = parseAmountToPence(body?.amount);

    if (!isDonationType(donationType)) {
      return NextResponse.json({ error: 'Please choose a valid donation type.' }, { status: 400 });
    }

    if (description.length < 3) {
      return NextResponse.json(
        { error: 'Please describe what you gave or did (at least 3 characters).' },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json({ error: 'Description is too long (max 500 characters).' }, { status: 400 });
    }

    if (donationType === 'money' && amountPence <= 0) {
      return NextResponse.json(
        { error: 'Please enter how much money you gave for money/sadaqah donations.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('kids_donations')
      .insert({
        user_id: user.id,
        donation_type: donationType,
        amount_pence: amountPence,
        description,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Donations table missing. Run SETUP_KIDS_DONATIONS.sql in Supabase.' },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      entry: normalizeDonationRow(data as Record<string, unknown>),
      message: 'MashaAllah! Your sadaqah has been logged.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save donation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
