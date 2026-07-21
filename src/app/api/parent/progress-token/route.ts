import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type CreateTokenBody = {
  childId?: string;
  parentEmail?: string;
  expiresInHours?: number;
};

const DEFAULT_EXPIRY_HOURS = 48;

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function tokenHash(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateTokenBody;
    const childId = String(body?.childId || '').trim();
    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    // Child can generate links only for their own profile.
    if (childId !== authUser.id) {
      return NextResponse.json({ error: 'You can only generate a parent link for your own account.' }, { status: 403 });
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, parent_email')
      .eq('uid', childId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: 'Child profile not found' }, { status: 404 });
    }

    const parentEmail = normalizeEmail(body?.parentEmail || userRow.parent_email);
    if (!parentEmail) {
      return NextResponse.json({ error: 'Parent email is required in profile before generating a secure link.' }, { status: 400 });
    }

    const expiresInHours = Number(body?.expiresInHours || DEFAULT_EXPIRY_HOURS);
    const boundedHours = Math.max(1, Math.min(168, Number.isFinite(expiresInHours) ? expiresInHours : DEFAULT_EXPIRY_HOURS));

    const now = Date.now();
    const expiresAt = new Date(now + boundedHours * 60 * 60 * 1000).toISOString();

    // Invalidate any previously unused links for this child/parent pair.
    await supabaseAdmin
      .from('parent_progress_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('child_user_id', childId)
      .eq('parent_email', parentEmail)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hash = tokenHash(rawToken);

    const { error: insertError } = await supabaseAdmin
      .from('parent_progress_tokens')
      .insert({
        token_hash: hash,
        child_user_id: childId,
        parent_email: parentEmail,
        created_by: authUser.id,
        expires_at: expiresAt,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const link = `${baseUrl}/parent-progress?token=${encodeURIComponent(rawToken)}`;

    return NextResponse.json({
      success: true,
      link,
      expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
