import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childName, storyTitle, duration, audioPath, recordingId } = body;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const toEmail = 'imediac786@gmail.com';
    
    // Construct Public URL
    // Pattern: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/story-recordings/${audioPath}`;
    
    // Admin Dashboard Link
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app'}/admin/recordings/${recordingId}`;

    // Download the file to attach it
    let attachments: any[] = [];
    try {
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from('story-recordings')
        .download(audioPath);

      if (downloadError) {
        console.error('Error downloading recording for attachment:', downloadError);
      } else if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        
        attachments.push({
          filename: `story-recording-${childName.replace(/[^a-z0-9]/gi, '_')}.webm`,
          content: base64Audio,
        });
      }
    } catch (err) {
      console.error('Failed to prepare attachment:', err);
    }

    const subject = `New Story Recording: ${storyTitle} by ${childName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f766e; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">New Story Submission 🎤</h2>
        </div>
        
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #374151;">A new story recording has been submitted!</p>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>👤 Child:</strong> ${childName}</p>
            <p style="margin: 8px 0;"><strong>📚 Story:</strong> ${storyTitle}</p>
            <p style="margin: 8px 0;"><strong>⏱️ Duration:</strong> ${duration} seconds</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${audioUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-right: 10px;">
              ▶️ Listen to Recording
            </a>
            
            <a href="${adminUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              🛡️ Review in Admin
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            The recording is also attached to this email.
            <br>
            Review this submission in the admin dashboard to award points.
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
        attachments,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in submit-notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
