import { describe, expect, it } from 'vitest';
import {
  normalizeMp3QuranReciters,
  normalizeMp3QuranSurahs,
} from '@/lib/mp3quran-catalog';

describe('normalizeMp3QuranReciters', () => {
  it('keeps playable HTTPS MP3Quran editions and valid surah numbers', () => {
    const reciters = normalizeMp3QuranReciters({
      reciters: [
        {
          id: 51,
          name: 'Test Reciter',
          moshaf: [
            {
              id: 53,
              name: 'Hafs Murattal',
              server: 'https://cdn.mp3quran.net/test/',
              surah_list: '1,2,2,0,115,114',
            },
            {
              id: 54,
              name: 'Insecure server',
              server: 'http://server.mp3quran.net/test',
              surah_list: '1,2',
            },
            {
              id: 55,
              name: 'Untrusted server',
              server: 'https://example.com/audio',
              surah_list: '1,2',
            },
          ],
        },
      ],
    });

    expect(reciters).toEqual([
      {
        id: '51',
        name: 'Test Reciter',
        editions: [
          {
            id: '53',
            name: 'Hafs Murattal',
            server: 'https://cdn.mp3quran.net/test',
            surahNumbers: [1, 2, 114],
          },
        ],
      },
    ]);
  });

  it('supports the legacy field names and rejects malformed catalog data', () => {
    expect(
      normalizeMp3QuranReciters({
        reciters: [
          {
            id: 1,
            name: 'Legacy Reciter',
            moshaf: [{ id: 2, Server: 'https://server.mp3quran.net/legacy', suras: '3,4' }],
          },
          { id: 3, name: 'No playable recordings', moshaf: [] },
        ],
      })[0].editions[0].surahNumbers
    ).toEqual([3, 4]);
    expect(normalizeMp3QuranReciters({ reciters: 'not an array' })).toEqual([]);
  });

  it('normalizes all 114 surahs in Quran order', () => {
    const surahs = normalizeMp3QuranSurahs({
      suwar: Array.from({ length: 114 }, (_, index) => ({
        id: index + 1,
        name: `Surah ${index + 1} `,
      })),
    });

    expect(surahs).toHaveLength(114);
    expect(surahs[0]).toEqual({ number: 1, name: 'Surah 1' });
    expect(surahs[113]).toEqual({ number: 114, name: 'Surah 114' });
  });
});
