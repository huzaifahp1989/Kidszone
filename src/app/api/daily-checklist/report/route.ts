import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Returns weekly + monthly breakdown of daily_progress for a given user.
// Admin can pass any userId; normal users pass their own.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const weeksBack = Math.min(12, Math.max(1, Number(searchParams.get('weeks') || 4)));
    const monthsBack = Math.min(12, Math.max(1, Number(searchParams.get('months') || 3)));

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Fetch last ~90 days of rows (covers both weekly and monthly windows)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Math.max(weeksBack * 7, monthsBack * 31));
    const fromStr = fromDate.toISOString().slice(0, 10);

    const { data: rows, error } = await supabaseAdmin
      .from('daily_progress')
      .select('date, completed_items, good_deed, daily_points')
      .eq('user_id', userId)
      .gte('date', fromStr)
      .order('date', { ascending: false });

    if (error) throw error;

    const today = new Date();

    // ── Weekly breakdown ────────────────────────────────────────────────────
    type WeekRow = {
      weekLabel: string;
      startDate: string;
      endDate: string;
      activeDays: number;
      totalTasks: number;
      totalPoints: number;
      goodDeeds: number;
      salahDays: number;        // days all 5 salah ticked
      quranDays: number;        // days any quran item ticked
    };

    const SALAH_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const weeks: WeekRow[] = [];
    for (let w = 0; w < weeksBack; w++) {
      // Week starts Monday
      const refDay = new Date(today);
      refDay.setDate(refDay.getDate() - (w * 7));
      const dayOfWeek = refDay.getDay(); // 0=Sun
      const daysFromMon = (dayOfWeek + 6) % 7; // Mon=0
      const weekStart = new Date(refDay);
      weekStart.setDate(refDay.getDate() - daysFromMon);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startStr = weekStart.toISOString().slice(0, 10);
      const endStr = weekEnd.toISOString().slice(0, 10);

      const weekRows = (rows || []).filter(r => r.date >= startStr && r.date <= endStr);

      const activeDays = weekRows.filter(r => (r.completed_items?.length || 0) > 0 || (r.good_deed || '').trim().length > 0).length;
      const totalTasks = weekRows.reduce((sum, r) => sum + (r.completed_items?.length || 0), 0);
      const totalPoints = weekRows.reduce((sum, r) => sum + (r.daily_points || 0), 0);
      const goodDeeds = weekRows.filter(r => (r.good_deed || '').trim().length > 0).length;
      const salahDays = weekRows.filter(r => SALAH_IDS.every(id => (r.completed_items || []).includes(id))).length;
      const quranDays = weekRows.filter(r => (r.completed_items || []).some((id: string) => id.startsWith('quran') || id.startsWith('surah') || id === 'ayat_kursi')).length;

      const labelStart = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const labelEnd = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      weeks.push({ weekLabel: `${labelStart} – ${labelEnd}`, startDate: startStr, endDate: endStr, activeDays, totalTasks, totalPoints, goodDeeds, salahDays, quranDays });
    }

    // ── Monthly breakdown ───────────────────────────────────────────────────
    type MonthRow = {
      monthKey: string;
      monthLabel: string;
      activeDays: number;
      totalTasks: number;
      totalPoints: number;
      goodDeeds: number;
      salahDays: number;
      quranDays: number;
      allSalahDaysPct: number; // % of active days with all 5 salah
    };

    const months: MonthRow[] = [];
    for (let m = 0; m < monthsBack; m++) {
      const refM = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const year = refM.getFullYear();
      const month = refM.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthLabel = refM.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      const monthRows = (rows || []).filter(r => r.date.startsWith(monthKey));
      const activeDays = monthRows.filter(r => (r.completed_items?.length || 0) > 0 || (r.good_deed || '').trim().length > 0).length;
      const totalTasks = monthRows.reduce((sum, r) => sum + (r.completed_items?.length || 0), 0);
      const totalPoints = monthRows.reduce((sum, r) => sum + (r.daily_points || 0), 0);
      const goodDeeds = monthRows.filter(r => (r.good_deed || '').trim().length > 0).length;
      const salahDays = monthRows.filter(r => SALAH_IDS.every(id => (r.completed_items || []).includes(id))).length;
      const quranDays = monthRows.filter(r => (r.completed_items || []).some((id: string) => id.startsWith('quran') || id.startsWith('surah') || id === 'ayat_kursi')).length;
      const allSalahDaysPct = activeDays > 0 ? Math.round((salahDays / activeDays) * 100) : 0;

      months.push({ monthKey, monthLabel, activeDays, totalTasks, totalPoints, goodDeeds, salahDays, quranDays, allSalahDaysPct });
    }

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalRows = rows || [];
    const totals = {
      activeDays: totalRows.filter(r => (r.completed_items?.length || 0) > 0).length,
      totalTasks: totalRows.reduce((sum, r) => sum + (r.completed_items?.length || 0), 0),
      totalPoints: totalRows.reduce((sum, r) => sum + (r.daily_points || 0), 0),
      goodDeeds: totalRows.filter(r => (r.good_deed || '').trim().length > 0).length,
    };

    return NextResponse.json({ success: true, weeks, months, totals });
  } catch (err: any) {
    console.error('Daily checklist report error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
