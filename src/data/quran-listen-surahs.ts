export type QuranListenSurah = {
  number: number;
  englishName: string;
  arabicName: string;
  group: 'short' | 'long';
  note: string;
};

/** Curated listen list for kids: quick short surahs and popular longer surahs. */
export const QURAN_LISTEN_SURAHS: QuranListenSurah[] = [
  {
    number: 1,
    englishName: 'Al-Fatihah',
    arabicName: 'الفاتحة',
    group: 'short',
    note: 'The opening surah read in every salah.',
  },
  {
    number: 112,
    englishName: 'Al-Ikhlas',
    arabicName: 'الإخلاص',
    group: 'short',
    note: 'A powerful surah about Allah\'s oneness.',
  },
  {
    number: 113,
    englishName: 'Al-Falaq',
    arabicName: 'الفلق',
    group: 'short',
    note: 'A protection dua from all kinds of harm.',
  },
  {
    number: 114,
    englishName: 'An-Nas',
    arabicName: 'الناس',
    group: 'short',
    note: 'A protection dua from whispering and evil thoughts.',
  },
  {
    number: 108,
    englishName: 'Al-Kawthar',
    arabicName: 'الكوثر',
    group: 'short',
    note: 'The shortest surah in the Quran.',
  },
  {
    number: 103,
    englishName: 'Al-Asr',
    arabicName: 'العصر',
    group: 'short',
    note: 'A timeless reminder to value time and good deeds.',
  },
  {
    number: 67,
    englishName: 'Al-Mulk',
    arabicName: 'الملك',
    group: 'long',
    note: 'Beloved nightly surah about Allah\'s power and reflection.',
  },
  {
    number: 36,
    englishName: 'Ya-Sin',
    arabicName: 'يس',
    group: 'long',
    note: 'Often called the heart of the Quran.',
  },
  {
    number: 18,
    englishName: 'Al-Kahf',
    arabicName: 'الكهف',
    group: 'long',
    note: 'A Friday favorite with powerful stories and lessons.',
  },
  {
    number: 55,
    englishName: 'Ar-Rahman',
    arabicName: 'الرحمن',
    group: 'long',
    note: 'Beautiful repetition of Allah\'s blessings.',
  },
  {
    number: 56,
    englishName: 'Al-Waqiah',
    arabicName: 'الواقعة',
    group: 'long',
    note: 'A vivid reminder of the Hereafter.',
  },
];

export const SHORT_LISTEN_SURAHS = QURAN_LISTEN_SURAHS.filter((s) => s.group === 'short');
export const LONG_LISTEN_SURAHS = QURAN_LISTEN_SURAHS.filter((s) => s.group === 'long');

export function isCuratedQuranListenSurah(surahNumber: number): boolean {
  return QURAN_LISTEN_SURAHS.some((s) => s.number === surahNumber);
}
