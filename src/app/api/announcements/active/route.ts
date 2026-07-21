import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const pathMatches = (targetPaths: string[] | null | undefined, path: string) => {
  if (!targetPaths || targetPaths.length === 0) return true;
  if (targetPaths.includes('*')) return true;
  return targetPaths.includes(path);
};

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
};

const isScheduleActive = (row: any, now: Date) => {
  const startAt = row?.start_at ? new Date(row.start_at) : null;
  const endAt = row?.end_at ? new Date(row.end_at) : null;

  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;

  const repeatUnit = ['always', 'hours', 'daily', 'weekly', 'monthly'].includes(String(row?.repeat_unit))
    ? String(row.repeat_unit)
    : 'always';
  if (repeatUnit === 'always') return true;

  const repeatEvery = Math.max(1, Number(row?.repeat_every || 1));
  const showForHours = Math.max(1, Number(row?.show_for_hours || 24));
  const cycleStart = startAt || (row?.created_at ? new Date(row.created_at) : null);
  if (!cycleStart) return true;
  if (now < cycleStart) return false;

  const windowMs = showForHours * 60 * 60 * 1000;

  if (repeatUnit === 'hours' || repeatUnit === 'daily' || repeatUnit === 'weekly') {
    const cycleHours = repeatUnit === 'hours' ? repeatEvery : repeatUnit === 'daily' ? repeatEvery * 24 : repeatEvery * 24 * 7;
    const cycleMs = cycleHours * 60 * 60 * 1000;
    const sinceMs = now.getTime() - cycleStart.getTime();
    const offsetInCycle = sinceMs % cycleMs;
    return offsetInCycle >= 0 && offsetInCycle < windowMs;
  }

  if (repeatUnit === 'monthly') {
    let monthsElapsed = (now.getUTCFullYear() - cycleStart.getUTCFullYear()) * 12 + (now.getUTCMonth() - cycleStart.getUTCMonth());
    if (monthsElapsed < 0) return false;

    while (monthsElapsed > 0) {
      const tentative = addMonths(cycleStart, monthsElapsed);
      if (tentative <= now) break;
      monthsElapsed -= 1;
    }

    const cycleGroupIndex = Math.floor(monthsElapsed / repeatEvery) * repeatEvery;
    const currentCycleStart = addMonths(cycleStart, cycleGroupIndex);
    const currentCycleEnd = new Date(currentCycleStart.getTime() + windowMs);
    return now >= currentCycleStart && now < currentCycleEnd;
  }

  return true;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const path = url.searchParams.get('path') || '/';

    const { data, error } = await supabase
      .from('site_announcements')
      .select('id, text, bg_color, created_at, display_mode, target_paths, popup_delay_seconds, popup_repeat_minutes, start_at, end_at, repeat_unit, repeat_every, show_for_hours, image_url, image_urls, slide_interval_seconds')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      // If RLS blocks anon, return empty gracefully
      return NextResponse.json({ announcement: null, announcements: [] });
    }

    const rows = Array.isArray(data) ? data : [];
    const now = new Date();
    const filtered = rows.filter((row: any) => {
      if (mode && row.display_mode !== mode) return false;
      if (!pathMatches(row.target_paths, path)) return false;
      return isScheduleActive(row, now);
    });

    return NextResponse.json({
      announcement: filtered[0] || null,
      announcements: filtered,
    });
  } catch (err: any) {
    return NextResponse.json({ announcement: null, announcements: [] });
  }
}
