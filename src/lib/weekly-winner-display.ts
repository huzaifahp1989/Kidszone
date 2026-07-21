export type WeeklyWinnerAnnouncement = {
  id: string;
  winner_name: string;
  madrasah_name: string | null;
  week_start_date: string;
  created_at: string;
};

export function formatWeekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return weekStartDate;

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return `${fmt(start)} – ${fmt(end)}`;
}

export function groupWinnersByWeek(winners: WeeklyWinnerAnnouncement[]) {
  const map = new Map<string, WeeklyWinnerAnnouncement[]>();
  for (const row of winners) {
    const key = String(row.week_start_date).slice(0, 10);
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStartDate, rows]) => ({ weekStartDate, winners: rows }));
}
