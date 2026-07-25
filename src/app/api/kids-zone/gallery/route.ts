import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';
import { unlockStickersForTriggers } from '@/lib/stickers-server';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 24;
const MAX_DATA_URL_CHARS = 450_000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireMatchingUser(request, searchParams.get('userId') || '');
    if (!auth.ok) return auth.response;

    const { data, error } = await supabaseAdmin
      .from('kids_zone_gallery')
      .select('id, kind, title, image_data, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS);

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ success: true, items: [] });
      throw error;
    }

    return NextResponse.json({
      success: true,
      items: (data || []).map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        imageUrl: row.image_data,
        createdAt: row.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const auth = await requireMatchingUser(request, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const kind = String(body?.kind || 'draw').slice(0, 32);
    const title = String(body?.title || 'My artwork').slice(0, 120);
    const imageDataUrl = String(body?.imageDataUrl || '');

    if (!imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }
    if (imageDataUrl.length > MAX_DATA_URL_CHARS) {
      return NextResponse.json({ error: 'Image too large — try a simpler drawing' }, { status: 400 });
    }

    const { count } = await supabaseAdmin
      .from('kids_zone_gallery')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId);

    if ((count || 0) >= MAX_ITEMS) {
      const { data: oldest } = await supabaseAdmin
        .from('kids_zone_gallery')
        .select('id')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (oldest?.id) {
        await supabaseAdmin.from('kids_zone_gallery').delete().eq('id', oldest.id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('kids_zone_gallery')
      .insert({
        user_id: auth.userId,
        kind,
        title,
        image_data: imageDataUrl,
      })
      .select('id, created_at')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Gallery table not set up yet. Run ADD_KIDS_ZONE_ENGAGEMENT.sql' },
          { status: 503 }
        );
      }
      throw error;
    }

    await unlockStickersForTriggers(auth.userId, ['gallery_save']);

    return NextResponse.json({
      success: true,
      id: data.id,
      createdAt: data.created_at,
      message: 'Saved to My Gallery!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
