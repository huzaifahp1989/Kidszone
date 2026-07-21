export type SalahPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type SalahStatus = 'completed' | 'missed';

export type SalahEntry = {
  id: string;
  userId: string;
  date: string;
  prayer: SalahPrayerKey;
  status: SalahStatus;
  prayedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalahStats = {
  rangeStart: string;
  rangeEnd: string;
  totalSlots: number;
  completed: number;
  missed: number;
  unlogged: number;
  completionRate: number;
};
