import { NextResponse } from 'next/server';
import { parseAmountToPence } from '@/lib/donations';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import {
  MAX_STRIPE_DONATION_PENCE,
  MIN_STRIPE_DONATION_PENCE,
  createDonationCheckoutSession,
} from '@/lib/stripe-donations';
import { isStripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Online payments are not configured yet. Ask a parent to set up Stripe.' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const description = String(body?.description || '').trim();
    const amountPence = parseAmountToPence(body?.amount);

    if (description.length < 3) {
      return NextResponse.json(
        { error: 'Please describe your sadaqah (at least 3 characters).' },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json({ error: 'Description is too long (max 500 characters).' }, { status: 400 });
    }

    if (amountPence < MIN_STRIPE_DONATION_PENCE) {
      return NextResponse.json(
        { error: `Minimum online donation is £${(MIN_STRIPE_DONATION_PENCE / 100).toFixed(2)}.` },
        { status: 400 }
      );
    }

    if (amountPence > MAX_STRIPE_DONATION_PENCE) {
      return NextResponse.json(
        { error: `Maximum online donation is £${(MAX_STRIPE_DONATION_PENCE / 100).toFixed(2)}.` },
        { status: 400 }
      );
    }

    const session = await createDonationCheckoutSession({
      userId: user.id,
      amountPence,
      description,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
