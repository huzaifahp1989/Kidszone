import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId, status, points, feedback, childName, childEmail } = body;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const toEmail = childEmail || 'imediac786@gmail.com'; // Fallback to admin if no child email

    const statusEmoji = status === 'approved' ? '✅' : '❌';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';
    const subject = `${statusEmoji} Your Recording Has Been ${statusText}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: ${status === 'approved' ? '#10b981' : '#ef4444'}; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">${statusEmoji} Recording ${statusText}</h2>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #374151;">Hi ${childName || 'there'}!</p>

          <div style="background-color: ${status === 'approved' ? '#f0fdf4' : '#fef2f2'}; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${status === 'approved' ? '#10b981' : '#ef4444'};">
            <p style="margin: 8px 0;"><strong>Your recording has been ${status.toLowerCase()}!</strong></p>
            ${status === 'approved' ? (
              points > 0 ? `<p style="margin: 8px 0;"><strong>🎉 Points Awarded:</strong> ${points}</p>` : ''
            ) : ''}
          </div>

          ${feedback ? `
            <h3 style="margin-top: 24px; color: #374151;">Teacher Feedback:</h3>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #6b7280;">
              <p style="margin: 0; white-space: pre-wrap;">${feedback}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app'}/my-recordings"
               style="background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              View My Recordings
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Keep up the great work learning about Islam! 📚🤲
          </p>
        </div>

        <div style="background-color: #f3f4f6; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
          Islamic Kids Learning Platform • Automated Notification
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Islamic Kids Platform <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error (notify-recording):', errorText);
      return NextResponse.json({ error: 'Failed to send notification email' }, { status: 500 });
    }

    const data = await response.json();
    console.log('Recording notification email sent:', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notify-recording API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}