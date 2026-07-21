export type QuranReciter = {
  id: string;
  name: string;
  arabicName: string;
  description: string;
};

/** Popular reciters — kid-friendly labels, verse-by-verse audio via alquran.cloud */
export const QURAN_RECITERS: QuranReciter[] = [
  {
    id: 'ar.alafasy',
    name: 'Mishary Alafasy',
    arabicName: 'مشاري العفاسي',
    description: 'Clear and gentle — great for learning',
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'Abdur-Rahman As-Sudais',
    arabicName: 'عبدالرحمن السديس',
    description: 'Imam of Masjid Al-Haram',
  },
  {
    id: 'ar.husary',
    name: 'Mahmoud Al-Husary',
    arabicName: 'محمود الحصري',
    description: 'Slow, steady recitation for memorization',
  },
  {
    id: 'ar.mahermuaiqly',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    description: 'Beautiful Makkah-style recitation',
  },
  {
    id: 'ar.saoodshuraym',
    name: 'Saood Ash-Shuraym',
    arabicName: 'سعود الشريم',
    description: 'Imam of Masjid Al-Haram',
  },
  {
    id: 'ar.shaatree',
    name: 'Abu Bakr Ash-Shatri',
    arabicName: 'أبو بكر الشاطري',
    description: 'Warm and expressive voice',
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit (Murattal)',
    arabicName: 'عبدالباسط عبدالصمد',
    description: 'Classic, melodious recitation',
  },
  {
    id: 'ar.minshawi',
    name: 'Mohamed Siddiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي',
    description: 'Famous Egyptian reciter',
  },
];

export const DEFAULT_RECITER_ID = 'ar.alafasy';

export function getReciter(id: string): QuranReciter | undefined {
  return QURAN_RECITERS.find((r) => r.id === id);
}

export function isValidReciterId(id: string): boolean {
  return QURAN_RECITERS.some((r) => r.id === id);
}
