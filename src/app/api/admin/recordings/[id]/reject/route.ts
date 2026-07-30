import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminRequest } from '@/lib/admin-auth';

const OPTIONAL_REJECT_COLUMNS = ['admin_notes', 'admin_feedback', 'is_published', 'reviewed_at'] as const;

function getMissingColumnFromError(message: string): string | null {
  const m = String(message || '');
  const match = m.match(/Could not find the '([\w_]+)' column|column\s+"?([\w_]+)"?\s+does not exist/i);
  return match?.[1] || match?.[2] || null;
}

async function updateRejectCompat(id: string, feedback: string) {
  let payload: Record<string, unknown> = {
    status: 'rejected',
    admin_notes: feedback,
    admin_feedback: feedback,
    is_published: false,
    reviewed_at: new Date().toISOString(),
  };

  let lastError: any = null;
  for (let attempt = 0; attempt <= OPTIONAL_REJECT_COLUMNS.length; attempt += 1) {
    const { error } = await supabaseAdmin.from('recordings').update(payload).eq('id', id);
    if (!error) return { error: null };

    lastError = error;
    const message = String(error.message || '');
    const missingColumn = getMissingColumnFromError(message);

    if (missingColumn && missingColumn in payload) {
      delete payload[missingColumn];
      continue;
    }

    const fallbackColumn = OPTIONAL_REJECT_COLUMNS.find(
      (column) =>
        column in payload &&
        new RegExp(column, 'i').test(message) &&
        /schema cache|column|does not exist|Could not find/i.test(message)
    );

    if (fallbackColumn) {
      delete payload[fallbackColumn];
      continue;
    }

    break;
  }

  return { error: lastError };
}

async function sendRejectionEmail(input: {
  childEmail: string;
  childName: string;
  feedback: string;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return { sent: false, reason: 'missing_resend_key' };

  const subject = '❌ Your Recording Needs One More Try';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://islamic-kids-platform.vercel.app';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">❌ Recording Rejected</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151;">Hi ${input.childName || 'there'}!</p>
        <p style="color: #374151;">Your recording was reviewed and needs one more try before approval.</p>
        <h3 style="margin-top: 24px; color: #374151;">Reason from teacher:</h3>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
          <p style="margin: 0; white-space: pre-wrap;">${input.feedback}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/my-recordings" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            View My Recordings
          </a>
        </div>
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
      to: [input.childEmail],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend API error (recording reject notify):', errorText);
    return { sent: false, reason: 'resend_failed' };
  }

  return { sent: true };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const feedback = String(body?.feedback || '').trim();

    if (!feedback) {
      return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
    }

    const { data: recording, error: loadError } = await supabaseAdmin
      .from('recordings')
      .select('id, user_id, child_name')
      .eq('id', id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const { error } = await updateRejectCompat(id, feedback);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let notificationSent = false;
    if (recording.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', recording.user_id)
        .maybeSingle();

      const childEmail = profile?.email?.trim();
      if (childEmail) {
        const childName = (profile?.name || recording.child_name || 'there').trim();
        const notify = await sendRejectionEmail({ childEmail, childName, feedback });
        notificationSent = Boolean(notify.sent);
      }
    }

    return NextResponse.json({ success: true, notificationSent });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
