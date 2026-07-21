import { NextRequest, NextResponse } from 'next/server';
import { getJuzAmmaSurah } from '@/data/juz-amma';
import { DEFAULT_RECITER_ID, isValidReciterId } from '@/data/quran-reciters';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ surahNumber: string }> };

type AyahResponse = {
  number: number;
  numberInSurah: number;
  arabic: string;
  arabicTajweed?: string;
  english: string;
  audio?: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { surahNumber: raw } = await context.params;
  const surahNumber = Number(raw);
  const reciterParam = request.nextUrl.searchParams.get('reciter') || DEFAULT_RECITER_ID;
  const reciter = isValidReciterId(reciterParam) ? reciterParam : DEFAULT_RECITER_ID;

  if (!Number.isInteger(surahNumber) || surahNumber < 78 || surahNumber > 114) {
    return NextResponse.json({ error: 'Juz Amma surahs are numbered 78 to 114' }, { status: 400 });
  }

  const meta = getJuzAmmaSurah(surahNumber);
  if (!meta) {
    return NextResponse.json({ error: 'Surah not found' }, { status: 404 });
  }

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,quran-tajweed,en.sahih,${reciter}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      throw new Error('Failed to load ayahs from Quran API');
    }

    const json = await res.json();
    const editions: Array<{
      ayahs?: Array<{ number: number; numberInSurah: number; text: string; audio?: string }>;
      edition?: { identifier?: string };
    }> = Array.isArray(json?.data) ? json.data : json?.data?.editions || [];

    const findEdition = (id: string) =>
      editions.find((e) => e.edition?.identifier === id);

    const arabicEdition = findEdition('quran-uthmani');
    const tajweedEdition = findEdition('quran-tajweed');
    const englishEdition = findEdition('en.sahih');
    const audioEdition = findEdition(reciter);

    const arabicAyahs = arabicEdition?.ayahs || [];
    const tajweedAyahs = tajweedEdition?.ayahs || [];
    const englishAyahs = englishEdition?.ayahs || [];
    const audioAyahs = audioEdition?.ayahs || [];

    const ayahs: AyahResponse[] = arabicAyahs.map((a, i) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      arabic: a.text,
      arabicTajweed: tajweedAyahs[i]?.text || tajweedAyahs.find((t) => t.numberInSurah === a.numberInSurah)?.text,
      english: englishAyahs[i]?.text || '',
      audio: audioAyahs[i]?.audio || audioAyahs.find((aa) => aa.numberInSurah === a.numberInSurah)?.audio,
    }));

    const fullArabicText = ayahs.map((a) => a.arabic).join(' ');
    const fullEnglishTranslation = ayahs.map((a) => a.english).join(' ');

    return NextResponse.json({
      meta,
      ayahs,
      reciter,
      fullArabicText,
      fullEnglishTranslation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load surah';
    return NextResponse.json({ error: message, meta }, { status: 502 });
  }
}
