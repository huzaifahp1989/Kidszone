import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'MAILCHIMP_API_KEY not configured' }, { status: 500 });
    }

    const dc = apiKey.includes('-') ? apiKey.split('-').pop() : null;
    if (!dc) {
      return NextResponse.json({ error: 'MAILCHIMP_API_KEY must include a datacenter suffix like -us12' }, { status: 500 });
    }

    const listId = '8ba87552de';
    const subscriberHash = crypto.createHash('md5').update(email).digest('hex');
    const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;

    const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        status: 'subscribed',
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const detail = typeof errJson?.detail === 'string' ? errJson.detail : null;
      const title = typeof errJson?.title === 'string' ? errJson.title : null;
      return NextResponse.json(
        { error: detail || title || 'Failed to subscribe to Mailchimp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in newsletter subscribe API:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

