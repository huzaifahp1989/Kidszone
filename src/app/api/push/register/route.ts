import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web']);
const ALLOWED_PROVIDERS = new Set(['onesignal', 'fcm']);

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const token = String(body?.token || '').trim();
    const platform = String(body?.platform || '').trim();
    const provider = String(body?.provider || 'onesignal').trim().toLowerCase();

    if (!token || !ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Invalid token or platform' }, { status: 400 });
    }

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('push_notification_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform,
        provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('provider')) {
        // Table missing or provider column not migrated yet — still accept without provider
        const fallback = await supabaseAdmin.from('push_notification_tokens').upsert(
          {
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        );
        if (fallback.error?.message?.includes('does not exist')) {
          return NextResponse.json({ ok: false, setupRequired: true }, { status: 200 });
        }
        if (fallback.error) throw fallback.error;
        return NextResponse.json({ ok: true, setupRequired: error.message?.includes('provider') });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to register push token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
