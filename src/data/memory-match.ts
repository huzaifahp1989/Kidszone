export type MemoryPair = {
  id: string;
  faceA: string;
  faceB: string;
  /** Optional emoji/icon shown on both faces for younger decks */
  emoji?: string;
};

export type MemoryDeck = {
  id: string;
  title: string;
  pairs: MemoryPair[];
};

/** Younger (≤8): picture/word pairs — fewer cards, larger tiles. */
export const YOUNGER_MEMORY_DECK: MemoryDeck = {
  id: 'younger-basics',
  title: 'Picture Match',
  pairs: [
    { id: 'y1', faceA: 'Prophet Musa', faceB: 'Prophet Musa', emoji: '🌊' },
    { id: 'y2', faceA: 'Salah', faceB: 'Prayer mat', emoji: '🕌' },
    { id: 'y3', faceA: 'Quran', faceB: 'Holy Book', emoji: '📖' },
    { id: 'y4', faceA: 'Kaaba', faceB: 'Makkah', emoji: '🕋' },
    { id: 'y5', faceA: 'Alif', faceB: 'ا', emoji: '✨' },
    { id: 'y6', faceA: 'Ba', faceB: 'ب', emoji: '🌙' },
  ],
};

/** Older (9+): Arabic–English / term–meaning pairs — more cards. */
export const OLDER_MEMORY_DECK: MemoryDeck = {
  id: 'older-terms',
  title: 'Term Match',
  pairs: [
    { id: 'o1', faceA: 'صلاة', faceB: 'Prayer' },
    { id: 'o2', faceA: 'زكاة', faceB: 'Charity' },
    { id: 'o3', faceA: 'صوم', faceB: 'Fasting' },
    { id: 'o4', faceA: 'حج', faceB: 'Pilgrimage' },
    { id: 'o5', faceA: 'إيمان', faceB: 'Faith' },
    { id: 'o6', faceA: 'توحيد', faceB: 'Oneness of Allah' },
    { id: 'o7', faceA: 'سنة', faceB: 'Prophet’s way' },
    { id: 'o8', faceA: 'ذكر', faceB: 'Remembrance' },
  ],
};

export function getMemoryDeck(isYounger: boolean): MemoryDeck {
  return isYounger ? YOUNGER_MEMORY_DECK : OLDER_MEMORY_DECK;
}
