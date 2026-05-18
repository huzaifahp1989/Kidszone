import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { isVoucherSetupMissing, updateRedemptionStatus } from '@/lib/voucher-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await supabaseAdmin
      .from('voucher_redemptions')
      .update({ status: 'expired' })
      .in('status', ['active', 'pending_approval'])
      .lt('expires_at', new Date().toISOString());

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    let query = supabaseAdmin
      .from('voucher_redemptions')
      .select('*, business_vouchers(title, business_name, image_url, logo_url)')
      .order('redeemed_at', { ascending: false })
      .limit(100);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ redemptions: data || [] });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true, redemptions: [] }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to load redemptions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const redemptionId = String(body?.redemptionId || '');
    const action = body?.action as 'approve' | 'mark_used' | 'cancel';
    const notes = typeof body?.notes === 'string' ? body.notes : '';

    if (!redemptionId || !action) {
      return NextResponse.json({ error: 'redemptionId and action are required' }, { status: 400 });
    }

    const redemption = await updateRedemptionStatus({ redemptionId, action, notes });
    return NextResponse.json({ redemption });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update redemption' }, { status: 500 });
  }
}