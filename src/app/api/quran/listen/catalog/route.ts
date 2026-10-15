import { NextResponse } from 'next/server';
import {
  normalizeMp3QuranReciters,
  normalizeMp3QuranSurahs,
} from '@/lib/mp3quran-catalog';

export const revalidate = 86400;

export async function GET() {
  try {
    const [recitersResponse, surahsResponse] = await Promise.all([
      fetch('https://www.mp3quran.net/api/v3/reciters?language=eng', {
        next: { revalidate: 86400 },
      }),
      fetch('https://www.mp3quran.net/api/v3/suwar?language=eng', {
        next: { revalidate: 86400 },
      }),
    ]);

    if (!recitersResponse.ok) {
      throw new Error(`MP3Quran reciters returned HTTP ${recitersResponse.status}.`);
    }
    if (!surahsResponse.ok) {
      throw new Error(`MP3Quran surah list returned HTTP ${surahsResponse.status}.`);
    }

    const [recitersPayload, surahsPayload] = await Promise.all([
      recitersResponse.json(),
      surahsResponse.json(),
    ]);
    const reciters = normalizeMp3QuranReciters(recitersPayload);
    const surahs = normalizeMp3QuranSurahs(surahsPayload);

    if (reciters.length === 0) {
      throw new Error('MP3Quran returned no playable reciters.');
    }
    if (surahs.length !== 114) {
      throw new Error(`MP3Quran returned ${surahs.length} surahs instead of 114.`);
    }

    return NextResponse.json({ reciters, surahs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not load the Quran listening catalog.';
    console.error('[quran/listen/catalog] error:', error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
