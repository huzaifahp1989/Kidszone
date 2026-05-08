import { NextRequest, NextResponse } from 'next/server';

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

    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID) {
      console.error('Mailchimp credentials not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const serverPrefix = MAILCHIMP_API_KEY.split('-')[1];
    const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;

    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MAILCHIMP_API_KEY}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        tags: ['newsletter-signup'],
      }),
    });

    if (!mailchimpResponse.ok) {
      const errorData = await mailchimpResponse.json().catch(() => ({}));

      if (mailchimpResponse.status === 400 && errorData?.title === 'Member Exists') {
        return NextResponse.json({
          success: true,
          message: 'Already subscribed'
        });
      }

      console.error('Mailchimp API error:', errorData);
      return NextResponse.json({
        error: 'Failed to subscribe. Please try again.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    console.error('Error in newsletter subscribe API:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}


