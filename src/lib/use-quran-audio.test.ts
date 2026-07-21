import { describe, expect, it } from 'vitest';
import {
  getNextQuranPlaybackIndex,
  getSkippedQuranPlaybackIndex,
  normalizeQuranRepeatRange,
} from '@/lib/use-quran-audio';

describe('Quran playback repeat sequencing', () => {
  it('normalizes repeat ranges inside the surah bounds', () => {
    expect(normalizeQuranRepeatRange({ start: 5, end: 2 }, 7)).toEqual({ start: 2, end: 5 });
    expect(normalizeQuranRepeatRange({ start: -3, end: 99 }, 4)).toEqual({ start: 1, end: 4 });
  });

  it('stops at the end when repeat is off', () => {
    expect(
      getNextQuranPlaybackIndex({
        currentIndex: 2,
        listLength: 3,
        repeatMode: 'off',
      })
    ).toBeNull();
  });

  it('replays the current ayah in single ayah repeat mode', () => {
    expect(
      getNextQuranPlaybackIndex({
        currentIndex: 1,
        listLength: 5,
        repeatMode: 'ayah',
      })
    ).toBe(1);
  });

  it('loops inside a selected repeat range', () => {
    expect(
      getNextQuranPlaybackIndex({
        currentIndex: 2,
        listLength: 6,
        repeatMode: 'range',
        repeatRange: { start: 2, end: 3 },
      })
    ).toBe(1);
  });

  it('loops the full surah when surah repeat is active', () => {
    expect(
      getNextQuranPlaybackIndex({
        currentIndex: 3,
        listLength: 4,
        repeatMode: 'surah',
      })
    ).toBe(0);
  });

  it('wraps skip controls within an active repeat range', () => {
    expect(
      getSkippedQuranPlaybackIndex({
        currentIndex: 1,
        listLength: 5,
        repeatMode: 'range',
        repeatRange: { start: 2, end: 4 },
        delta: -1,
        sequential: true,
      })
    ).toBe(3);
  });

  it('does not wrap manual skips outside sequential repeat playback', () => {
    expect(
      getSkippedQuranPlaybackIndex({
        currentIndex: 0,
        listLength: 5,
        repeatMode: 'surah',
        delta: -1,
        sequential: false,
      })
    ).toBeNull();
  });
});
