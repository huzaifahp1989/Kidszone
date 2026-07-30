import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_RECITER_ID, isValidReciterId } from '@/data/quran-reciters';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ surahNumber: string }> };

type AyahPayload = {
  numberInSurah: number;
  arabic: string;
  english: string;
  audio?: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { surahNumber: raw } = await context.params;
  const surahNumber = Number(raw);
  const reciterParam = request.nextUrl.searchParams.get('reciter') || DEFAULT_RECITER_ID;
  const reciter = isValidReciterId(reciterParam) ? reciterParam : DEFAULT_RECITER_ID;

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ error: 'Surah number must be between 1 and 114.' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,${reciter}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      throw new Error('Failed to load surah audio.');
    }

    const json = await res.json();
    const editions: Array<{
      englishName?: string;
      name?: string;
      number?: number;
      numberOfAyahs?: number;
      revelationType?: string;
      ayahs?: Array<{ numberInSurah: number; text: string; audio?: string }>;
      edition?: { identifier?: string };
    }> = Array.isArray(json?.data) ? json.data : [];

    const findEdition = (id: string) => editions.find((e) => e.edition?.identifier === id);

    const arabicEdition = findEdition('quran-uthmani');
    const englishEdition = findEdition('en.sahih');
    const audioEdition = findEdition(reciter);

    const arabicAyahs = arabicEdition?.ayahs || [];
    const englishAyahs = englishEdition?.ayahs || [];
    const audioAyahs = audioEdition?.ayahs || [];

    const ayahs: AyahPayload[] = arabicAyahs.map((ayah, index) => ({
      numberInSurah: ayah.numberInSurah,
      arabic: ayah.text,
      english: englishAyahs[index]?.text || '',
      audio:
        audioAyahs[index]?.audio ||
        audioAyahs.find((item) => item.numberInSurah === ayah.numberInSurah)?.audio,
    }));

    const meta = {
      number: arabicEdition?.number || surahNumber,
      englishName: arabicEdition?.englishName || `Surah ${surahNumber}`,
      arabicName: arabicEdition?.name || '',
      ayahCount: arabicEdition?.numberOfAyahs || ayahs.length,
      revelation: arabicEdition?.revelationType || null,
    };

    return NextResponse.json({
      reciter,
      meta,
      ayahs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load surah.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
