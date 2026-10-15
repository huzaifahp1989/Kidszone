export type QuranRecordingEdition = {
  id: string;
  name: string;
  server: string;
  surahNumbers: number[];
};

export type QuranAudioReciter = {
  id: string;
  name: string;
  editions: QuranRecordingEdition[];
};

export type QuranListenSurah = {
  number: number;
  name: string;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAudioServer(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      (url.hostname !== 'mp3quran.net' && !url.hostname.endsWith('.mp3quran.net'))
    ) {
      return null;
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function parseSurahNumbers(value: unknown): number[] {
  const entries =
    typeof value === 'string'
      ? value.split(',')
      : Array.isArray(value)
        ? value
        : [];

  return [...new Set(
    entries
      .map((entry) => Number(entry))
      .filter((number) => Number.isInteger(number) && number >= 1 && number <= 114)
  )];
}

export function normalizeMp3QuranReciters(payload: unknown): QuranAudioReciter[] {
  if (!isRecord(payload) || !Array.isArray(payload.reciters)) return [];

  return payload.reciters.flatMap((reciter): QuranAudioReciter[] => {
    if (!isRecord(reciter)) return [];

    const id = String(reciter.id ?? '').trim();
    const name = typeof reciter.name === 'string' ? reciter.name.trim() : '';
    if (!id || !name || !Array.isArray(reciter.moshaf)) return [];

    const editions = reciter.moshaf.flatMap((edition, index): QuranRecordingEdition[] => {
      if (!isRecord(edition)) return [];

      const server = normalizeAudioServer(edition.server ?? edition.Server);
      const surahNumbers = parseSurahNumbers(edition.surah_list ?? edition.suras);
      if (!server || surahNumbers.length === 0) return [];

      return [{
        id: String(edition.id ?? `${id}-${index}`),
        name: typeof edition.name === 'string' && edition.name.trim()
          ? edition.name.trim()
          : `Recitation ${index + 1}`,
        server,
        surahNumbers,
      }];
    });

    return editions.length > 0 ? [{ id, name, editions }] : [];
  });
}

export function normalizeMp3QuranSurahs(payload: unknown): QuranListenSurah[] {
  if (!isRecord(payload) || !Array.isArray(payload.suwar)) return [];

  const surahs = payload.suwar.flatMap((entry): QuranListenSurah[] => {
    if (!isRecord(entry)) return [];

    const number = Number(entry.id);
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    return Number.isInteger(number) && number >= 1 && number <= 114 && name
      ? [{ number, name }]
      : [];
  });

  return [...new Map(surahs.map((surah) => [surah.number, surah])).values()]
    .sort((left, right) => left.number - right.number);
}
