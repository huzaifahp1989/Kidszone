import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject, uploadObject } from '@/lib/object-storage';
import { isKidsAudioCategory, withCategoryMarker } from '@/lib/kids-audio';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('recording');
    const categoryRaw = formData.get('category') as string | null;
    const title = formData.get('title') as string | null;
    const duration = formData.get('duration') as string | null;
    const childName = formData.get('childName') as string | null;
    const message = formData.get('message') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Recording file is required' }, { status: 400 });
    }

    const category = categoryRaw && isKidsAudioCategory(categoryRaw) ? categoryRaw : null;
    if (categoryRaw && !category) {
      return NextResponse.json(
        { error: 'Category must be quran, nasheed, story, or hadith' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Recording is empty. Please try recording again.' }, { status: 400 });
    }

    const safeChildName = childName && childName.trim().length > 0 ? childName.trim() : null;
    const safeTitle = title && title.trim().length > 0 ? title.trim() : 'Untitled';
    const timestamp = Date.now();
    const safeDescription = withCategoryMarker(category, message);

    const uploadedFile = file as File;
    const mimeType =
      typeof uploadedFile.type === 'string' && uploadedFile.type.length > 0
        ? uploadedFile.type
        : 'audio/webm';
    const originalName = typeof uploadedFile.name === 'string' ? uploadedFile.name : '';
    const extFromName = originalName.includes('.')
      ? originalName.split('.').pop()?.toLowerCase()
      : undefined;
    const extFromMime = mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('mpeg')
        ? 'mp3'
        : mimeType.includes('ogg')
          ? 'ogg'
          : 'webm';
    const extension = extFromName || extFromMime || 'webm';

    const filename = `studio/${userId || 'guest'}_${timestamp}_${category || 'rec'}_${safeTitle.replace(/[^a-zA-Z0-9]/g, '-')}.${extension}`;

    try {
      await uploadObject({
        bucket: 'story-recordings',
        path: filename,
        body: buffer,
        contentType: mimeType,
      });
    } catch (uploadError) {
      console.error('Storage upload error:', uploadError);
      const detail = uploadError instanceof Error ? uploadError.message : 'Unknown storage error';
      return NextResponse.json(
        {
          error: 'Failed to upload recording to storage',
          detail: process.env.NODE_ENV === 'production' ? detail.slice(0, 300) : detail,
        },
        { status: 500 }
      );
    }

    const baseRow: Record<string, unknown> = {
      user_id: userId || null,
      story_id: null,
      child_name: safeChildName,
      title: safeTitle,
      description: safeDescription,
      audio_path: filename,
      duration: parseInt(duration || '0', 10) || 0,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };

    let insertedRecord: { id: string } | null = null;
    let dbError: { message?: string } | null = null;

    const tryInsert = async (row: Record<string, unknown>) => {
      const result = await supabaseAdmin.from('recordings').insert(row).select('id').single();
      return { data: result.data as { id: string } | null, error: result.error as { message?: string } | null };
    };

    // Prefer native category column when available; fall back if migration not applied yet.
    ({ data: insertedRecord, error: dbError } = await tryInsert({ ...baseRow, category: category || null }));

    if (dbError && /category/i.test(String(dbError.message || ''))) {
      ({ data: insertedRecord, error: dbError } = await tryInsert(baseRow));
    }

    // Guest uploads: user_id may be NOT NULL or FK-constrained — retry without it.
    if (dbError && /user_id/i.test(String(dbError.message || ''))) {
      const { user_id: _omit, ...withoutUser } = baseRow;
      ({ data: insertedRecord, error: dbError } = await tryInsert(withoutUser));
      if (dbError && /category/i.test(String(dbError.message || ''))) {
        // already without category path handled above; keep without user
      }
    }

    if (dbError || !insertedRecord) {
      console.error('DB insert error:', dbError);
      try {
        await deleteObject('story-recordings', filename);
      } catch {
        /* ignore */
      }
      const detail = String(dbError?.message || 'unknown db error').slice(0, 300);
      return NextResponse.json({ error: 'Failed to save recording record', detail }, { status: 500 });
    }

    // 3. Send Email
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      // Return success because recording IS saved, just email failed
      return NextResponse.json({ success: true, warning: 'Email service not configured' });
    }

    const toEmail = 'imediac786@gmail.com';

    const base64Audio = buffer.toString('base64');
    
    // Link to Admin Dashboard
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app'}/admin/recordings/${insertedRecord.id}`;

    const subject = safeChildName
      ? `New Studio Recording from ${safeChildName} (${category || 'recording'})`
      : `New Studio Recording: ${category || 'recording'}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Kids Studio Recording</h2>
        <p><strong>Child:</strong> ${safeChildName || 'Not signed in'}</p>
        <p><strong>Category:</strong> ${category || 'Not specified'}</p>
        <p><strong>Title:</strong> ${safeTitle}</p>
        <p><strong>Duration:</strong> ${duration || 'Unknown'} seconds</p>
        ${
          message && message.trim().length > 0
            ? `<h3 style="margin-top: 16px;">Message from child:</h3>
               <div style="background: #f3f4f6; padding: 10px; border-radius: 8px; white-space: pre-wrap;">${message}</div>`
            : ''
        }
        
        <div style="margin-top: 24px; padding: 16px; background: #e0f2fe; border-radius: 8px;">
          <p style="margin: 0; font-weight: bold;">Admin Action:</p>
          <p style="margin-top: 8px;">
            <a href="${adminUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review & Download in Admin Panel
            </a>
          </p>
        </div>

        <p style="margin-top: 16px;">A new recording has been submitted from the Islamic Kids Recording Studio.</p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
          This email was sent automatically from the Islamic Kids Learning Platform studio tool.
        </p>
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
        attachments: [
          {
            filename: `recording.${extension}`,
            content: base64Audio,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error (studio-submit):', errorText);
      // Don't fail the request since we saved the recording
      return NextResponse.json({ success: true, warning: 'Failed to send email notification' });
    }

    const data = await response.json();
    console.log('Studio recording email sent:', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in studio-submit API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
