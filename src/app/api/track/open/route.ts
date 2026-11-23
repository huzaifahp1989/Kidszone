import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/track/open?s=<sendId>&e=<recipient email>
//
// 1x1 tracking pixel appended to admin emails. Each fetch records a unique open
// for that recipient (repeated fetches by the same mailbox are ignored). This
// endpoint is intentionally public because it is loaded by email clients, and
// it always returns the pixel even if recording fails.

export const dynamic = 'force-dynamic';

const PIXEL = new Uint8Array(
  Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sendId = (searchParams.get('s') || '').trim();
    const recipient = (searchParams.get('e') || '').trim().toLowerCase();

    if (UUID_RE.test(sendId) && recipient.includes('@')) {
      await supabaseAdmin
        .from('email_opens')
        .upsert(
          { send_id: sendId, recipient },
          { onConflict: 'send_id,recipient', ignoreDuplicates: true }
        );
    }
  } catch (error) {
    console.error('[track/open]', error);
  }

  return pixelResponse();
}
