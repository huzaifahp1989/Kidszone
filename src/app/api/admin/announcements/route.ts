import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { announcementHasVisualContent, normalizeAnnouncementImages } from '@/lib/announcement-images';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  return authHeader === 'true';
};

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('site_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ announcements: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      text,
      bg_color,
      active,
      display_mode,
      target_paths,
      popup_delay_seconds,
      popup_repeat_minutes,
      start_at,
      end_at,
      repeat_unit,
      repeat_every,
      show_for_hours,
      image_url,
      image_urls,
      slide_interval_seconds,
    } = body as {
      text: string;
      bg_color: string;
      active?: boolean;
      display_mode?: 'inline' | 'popup' | 'bar';
      target_paths?: string[];
      popup_delay_seconds?: number;
      popup_repeat_minutes?: number;
      start_at?: string | null;
      end_at?: string | null;
      repeat_unit?: 'always' | 'hours' | 'daily' | 'weekly' | 'monthly';
      repeat_every?: number;
      show_for_hours?: number;
      image_url?: string | null;
      image_urls?: string[] | null;
      slide_interval_seconds?: number;
    };
    const trimmedText = typeof text === 'string' ? text.trim() : '';
    const images = normalizeAnnouncementImages({ image_url, image_urls });
    if (!announcementHasVisualContent(trimmedText, images.image_urls) || !bg_color) {
      return NextResponse.json({ error: 'Add announcement text or at least one image, and choose a background color' }, { status: 400 });
    }

    const mode = display_mode === 'popup' || display_mode === 'bar' ? display_mode : 'inline';
    const paths = Array.isArray(target_paths) && target_paths.length > 0 ? target_paths : ['*'];
    const popupDelaySeconds = Number.isFinite(Number(popup_delay_seconds))
      ? Math.max(0, Math.floor(Number(popup_delay_seconds)))
      : 0;
    const popupRepeatMinutes = Number.isFinite(Number(popup_repeat_minutes))
      ? Math.max(1, Math.floor(Number(popup_repeat_minutes)))
      : 1440;
    const repeatUnit = ['always', 'hours', 'daily', 'weekly', 'monthly'].includes(String(repeat_unit))
      ? String(repeat_unit)
      : 'always';
    const repeatEvery = Number.isFinite(Number(repeat_every))
      ? Math.max(1, Math.floor(Number(repeat_every)))
      : 1;
    const showForHours = Number.isFinite(Number(show_for_hours))
      ? Math.max(1, Math.floor(Number(show_for_hours)))
      : 24;
    const slideIntervalSeconds = Number.isFinite(Number(slide_interval_seconds))
      ? Math.max(2, Math.min(60, Math.floor(Number(slide_interval_seconds))))
      : 5;
    const startAtIso = start_at ? new Date(start_at).toISOString() : null;
    const endAtIso = end_at ? new Date(end_at).toISOString() : null;

    const { data: inserted, error } = await supabaseAdmin
      .from('site_announcements')
      .insert({
        text: trimmedText,
        bg_color,
        active: !!active,
        display_mode: mode,
        target_paths: paths,
        popup_delay_seconds: popupDelaySeconds,
        popup_repeat_minutes: popupRepeatMinutes,
        start_at: startAtIso,
        end_at: endAtIso,
        repeat_unit: repeatUnit,
        repeat_every: repeatEvery,
        show_for_hours: showForHours,
        image_url: images.image_url,
        image_urls: images.image_urls,
        slide_interval_seconds: slideIntervalSeconds,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ announcement: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      id,
      active,
      text,
      bg_color,
      display_mode,
      target_paths,
      popup_delay_seconds,
      popup_repeat_minutes,
      start_at,
      end_at,
      repeat_unit,
      repeat_every,
      show_for_hours,
      image_url,
      image_urls,
      slide_interval_seconds,
    } = body as {
      id: string;
      active: boolean;
      text?: string;
      bg_color?: string;
      display_mode?: 'inline' | 'popup' | 'bar';
      target_paths?: string[];
      popup_delay_seconds?: number;
      popup_repeat_minutes?: number;
      start_at?: string | null;
      end_at?: string | null;
      repeat_unit?: 'always' | 'hours' | 'daily' | 'weekly' | 'monthly';
      repeat_every?: number;
      show_for_hours?: number;
      image_url?: string | null;
      image_urls?: string[] | null;
      slide_interval_seconds?: number;
    };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = { active };
    if (typeof text === 'string') updatePayload.text = text;
    if (typeof bg_color === 'string') updatePayload.bg_color = bg_color;
    if (display_mode === 'inline' || display_mode === 'popup' || display_mode === 'bar') {
      updatePayload.display_mode = display_mode;
    }
    if (Array.isArray(target_paths) && target_paths.length > 0) {
      updatePayload.target_paths = target_paths;
    }
    if (popup_delay_seconds !== undefined) {
      updatePayload.popup_delay_seconds = Math.max(0, Math.floor(Number(popup_delay_seconds) || 0));
    }
    if (popup_repeat_minutes !== undefined) {
      updatePayload.popup_repeat_minutes = Math.max(1, Math.floor(Number(popup_repeat_minutes) || 1));
    }
    if (start_at !== undefined) {
      updatePayload.start_at = start_at ? new Date(start_at).toISOString() : null;
    }
    if (end_at !== undefined) {
      updatePayload.end_at = end_at ? new Date(end_at).toISOString() : null;
    }
    if (repeat_unit !== undefined && ['always', 'hours', 'daily', 'weekly', 'monthly'].includes(String(repeat_unit))) {
      updatePayload.repeat_unit = repeat_unit;
    }
    if (repeat_every !== undefined) {
      updatePayload.repeat_every = Math.max(1, Math.floor(Number(repeat_every) || 1));
    }
    if (show_for_hours !== undefined) {
      updatePayload.show_for_hours = Math.max(1, Math.floor(Number(show_for_hours) || 1));
    }
    if (image_url !== undefined || image_urls !== undefined) {
      const images = normalizeAnnouncementImages({
        image_url: image_url ?? undefined,
        image_urls: image_urls ?? undefined,
      });
      updatePayload.image_url = images.image_url;
      updatePayload.image_urls = images.image_urls;
    }
    if (slide_interval_seconds !== undefined) {
      updatePayload.slide_interval_seconds = Math.max(2, Math.min(60, Math.floor(Number(slide_interval_seconds) || 5)));
    }
    if (text !== undefined && (image_url !== undefined || image_urls !== undefined)) {
      const nextText = typeof text === 'string' ? text.trim() : '';
      const images = normalizeAnnouncementImages({
        image_url: image_url ?? undefined,
        image_urls: image_urls ?? undefined,
      });
      if (!announcementHasVisualContent(nextText, images.image_urls)) {
        return NextResponse.json({ error: 'Add announcement text or at least one image' }, { status: 400 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('site_announcements')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ announcement: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = typeof body?.id === 'string' ? body.id : '';
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('site_announcements').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
