/** Kid-friendly surahs for memorization tracking (Juz Amma + short surahs). */
export type HifzSurah = {
  number: number;
  arabicName: string;
  englishName: string;
  ayahCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
};

export const HIFZ_SURAH_LIST: HifzSurah[] = [
  { number: 1, arabicName: 'الفاتحة', englishName: 'Al-Fatihah', ayahCount: 7, difficulty: 'beginner' },
  { number: 112, arabicName: 'الإخلاص', englishName: 'Al-Ikhlas', ayahCount: 4, difficulty: 'beginner' },
  { number: 113, arabicName: 'الفلق', englishName: 'Al-Falaq', ayahCount: 5, difficulty: 'beginner' },
  { number: 114, arabicName: 'الناس', englishName: 'An-Nas', ayahCount: 6, difficulty: 'beginner' },
  { number: 108, arabicName: 'الكوثر', englishName: 'Al-Kawthar', ayahCount: 3, difficulty: 'beginner' },
  { number: 109, arabicName: 'الكافرون', englishName: 'Al-Kafirun', ayahCount: 6, difficulty: 'beginner' },
  { number: 110, arabicName: 'النصر', englishName: 'An-Nasr', ayahCount: 3, difficulty: 'beginner' },
  { number: 111, arabicName: 'المسد', englishName: 'Al-Masad', ayahCount: 5, difficulty: 'beginner' },
  { number: 105, arabicName: 'الفيل', englishName: 'Al-Fil', ayahCount: 5, difficulty: 'beginner' },
  { number: 106, arabicName: 'قريش', englishName: 'Quraish', ayahCount: 4, difficulty: 'beginner' },
  { number: 107, arabicName: 'الماعون', englishName: 'Al-Maun', ayahCount: 7, difficulty: 'beginner' },
  { number: 103, arabicName: 'العصر', englishName: 'Al-Asr', ayahCount: 3, difficulty: 'beginner' },
  { number: 104, arabicName: 'الهمزة', englishName: 'Al-Humazah', ayahCount: 9, difficulty: 'intermediate' },
  { number: 102, arabicName: 'التكاثر', englishName: 'At-Takathur', ayahCount: 8, difficulty: 'intermediate' },
  { number: 101, arabicName: 'القارعة', englishName: 'Al-Qariah', ayahCount: 11, difficulty: 'intermediate' },
  { number: 100, arabicName: 'العاديات', englishName: 'Al-Adiyat', ayahCount: 11, difficulty: 'intermediate' },
  { number: 99, arabicName: 'الزلزلة', englishName: 'Az-Zalzalah', ayahCount: 8, difficulty: 'intermediate' },
  { number: 98, arabicName: 'البينة', englishName: 'Al-Bayyinah', ayahCount: 8, difficulty: 'intermediate' },
  { number: 97, arabicName: 'القدر', englishName: 'Al-Qadr', ayahCount: 5, difficulty: 'beginner' },
  { number: 96, arabicName: 'العلق', englishName: 'Al-Alaq', ayahCount: 19, difficulty: 'intermediate' },
  { number: 67, arabicName: 'الملك', englishName: 'Al-Mulk', ayahCount: 30, difficulty: 'advanced' },
  { number: 36, arabicName: 'يس', englishName: 'Yaseen', ayahCount: 83, difficulty: 'advanced' },
  { number: 18, arabicName: 'الكهف', englishName: 'Al-Kahf', ayahCount: 110, difficulty: 'advanced' },
];

export function getHifzSurah(number: number): HifzSurah | undefined {
  return HIFZ_SURAH_LIST.find((s) => s.number === number);
}
