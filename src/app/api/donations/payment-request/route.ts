import { NextResponse } from 'next/server';
import {
  buildParentShareMessage,
  createDonationPaymentRequest,
} from '@/lib/donation-payment-requests';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isStripeConfigured } from '@/lib/stripe';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Online payments are not configured yet.' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ensured = await ensureUserRecords(user.id);
    if (!ensured.ok) {
      return NextResponse.json(
        { error: ensured.error || 'Could not prepare your account. Please try signing out and back in.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { request: paymentRequest, parentPayUrl } = await createDonationPaymentRequest({
      userId: user.id,
      amount: body?.amount,
      description: body?.description,
    });

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('uid', user.id)
      .maybeSingle();
    const childName = String(userRow?.name || 'My child').trim() || 'My child';

    return NextResponse.json({
      success: true,
      request: paymentRequest,
      parentPayUrl,
      shareMessage: buildParentShareMessage(childName, paymentRequest.amountPence, parentPayUrl),
      message: 'Share this link with your parent or guardian so they can pay securely.',
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Failed to create payment link');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
