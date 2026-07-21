import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import type { SalahEntry, SalahPrayerKey, SalahStats, SalahStatus } from '@/types/salah';

export const SALAH_PRAYERS: Array<{ key: SalahPrayerKey; label: string }> = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
];

export const toDateKey = (value: Date) => format(value, 'yyyy-MM-dd');

export function getMonthBounds(value: Date) {
  const start = startOfMonth(value);
  const end = endOfMonth(value);
  return { start, end };
}

export function buildCalendarGrid(month: Date, weekStartsOn: 1 | 0 = 1) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return { gridStart, gridEnd, days, monthStart, monthEnd };
}

export function normalizeSalahEntryRow(row: any): SalahEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: String(row.date),
    prayer: row.prayer as SalahPrayerKey,
    status: row.status as SalahStatus,
    prayedAt: row.prayed_at ? String(row.prayed_at) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function computeSalahStats(entries: SalahEntry[], rangeStart: Date, rangeEnd: Date): SalahStats {
  const startKey = toDateKey(rangeStart);
  const endKey = toDateKey(rangeEnd);
  const unique = new Map<string, SalahEntry>();
  for (const entry of entries) {
    unique.set(`${entry.date}:${entry.prayer}`, entry);
  }

  const dayCount = Math.max(1, Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const totalSlots = dayCount * SALAH_PRAYERS.length;
  let completed = 0;
  let missed = 0;
  let logged = 0;

  for (let d = 0; d < dayCount; d += 1) {
    const dateKey = toDateKey(addDays(rangeStart, d));
    for (const prayer of SALAH_PRAYERS) {
      const item = unique.get(`${dateKey}:${prayer.key}`);
      if (!item) continue;
      logged += 1;
      if (item.status === 'completed') completed += 1;
      if (item.status === 'missed') missed += 1;
    }
  }

  const unlogged = Math.max(0, totalSlots - logged);
  const completionRate = totalSlots > 0 ? completed / totalSlots : 0;

  return {
    rangeStart: startKey,
    rangeEnd: endKey,
    totalSlots,
    completed,
    missed,
    unlogged,
    completionRate,
  };
}

export function inferStatus(prayed: boolean | null | undefined): SalahStatus {
  return prayed ? 'completed' : 'missed';
}
