import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json();
    const feedbackRecipient = process.env.FEEDBACK_TO_EMAIL || 'imediac786@gmail.com';

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      );
    }

    // Using Resend API (you'll need to sign up at resend.com and get an API key)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Islamic Kids Platform <onboarding@resend.dev>',
        to: [feedbackRecipient],
        subject: 'New Feedback - Islamic Kids Learning Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Feedback Received</h2>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <h3>Feedback Message:</h3>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${feedback}</div>
            <hr />
            <p style="color: #666; font-size: 12px;">
              This feedback was submitted through the Islamic Kids Learning Platform feedback form.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Email sent successfully:', data);

    return NextResponse.json(
      { success: true, message: 'Feedback sent successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
