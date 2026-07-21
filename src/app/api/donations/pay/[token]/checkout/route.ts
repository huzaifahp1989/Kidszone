import { NextResponse } from 'next/server';
import {
  attachCheckoutSessionToPaymentRequest,
  getDonationPaymentRequestByToken,
} from '@/lib/donation-payment-requests';
import { createDonationCheckoutSession } from '@/lib/stripe-donations';
import { isStripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Online payments are not configured yet.' },
        { status: 503 }
      );
    }

    const { token } = await context.params;
    const paymentRequest = await getDonationPaymentRequestByToken(token);

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Payment link not found.' }, { status: 404 });
    }

    if (paymentRequest.status === 'paid') {
      return NextResponse.json({ error: 'This sadaqah has already been paid.' }, { status: 410 });
    }

    if (paymentRequest.status === 'expired') {
      return NextResponse.json({ error: 'This payment link has expired. Ask your child for a new link.' }, { status: 410 });
    }

    const session = await createDonationCheckoutSession({
      userId: paymentRequest.userId,
      amountPence: paymentRequest.amountPence,
      description: paymentRequest.description,
      paymentRequestId: paymentRequest.id,
      paymentRequestToken: paymentRequest.token,
    });

    await attachCheckoutSessionToPaymentRequest({
      paymentRequestId: paymentRequest.id,
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
