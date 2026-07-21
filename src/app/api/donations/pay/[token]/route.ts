import { NextResponse } from 'next/server';
import { getDonationPaymentRequestPublic } from '@/lib/donation-payment-requests';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const request = await getDonationPaymentRequestPublic(token);

    if (!request) {
      return NextResponse.json({ error: 'Payment link not found.' }, { status: 404 });
    }

    return NextResponse.json({ request });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load payment link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
