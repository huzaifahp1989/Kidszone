export type StickerRarity = 'common' | 'rare' | 'legendary';

export type StickerDef = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: StickerRarity;
  /** Event keys that unlock this sticker (first match wins). */
  triggers: string[];
};

export const STICKER_CATALOG: StickerDef[] = [
  {
    id: 'crescent_glow',
    name: 'Crescent Glow',
    emoji: '🌙',
    description: 'Finish any Create & Play activity',
    rarity: 'common',
    triggers: ['create_any'],
  },
  {
    id: 'palette_star',
    name: 'Palette Star',
    emoji: '🎨',
    description: 'Claim creative colouring or drawing points',
    rarity: 'common',
    triggers: ['create_creative'],
  },
  {
    id: 'story_compass',
    name: 'Story Compass',
    emoji: '🧭',
    description: 'Finish a story adventure',
    rarity: 'common',
    triggers: ['create_story_choice'],
  },
  {
    id: 'dua_hands',
    name: 'Dua Hands',
    emoji: '🤲',
    description: 'Say the dua of the day',
    rarity: 'common',
    triggers: ['create_dua'],
  },
  {
    id: 'kind_heart',
    name: 'Kind Heart',
    emoji: '💛',
    description: 'Complete the kindness hunt',
    rarity: 'rare',
    triggers: ['create_kindness'],
  },
  {
    id: 'manners_spark',
    name: 'Manners Spark',
    emoji: '✨',
    description: 'Practise good manners',
    rarity: 'common',
    triggers: ['create_manners'],
  },
  {
    id: 'quiz_brain',
    name: 'Quiz Brain',
    emoji: '🧠',
    description: 'Complete a daily quiz',
    rarity: 'common',
    triggers: ['quiz_complete'],
  },
  {
    id: 'game_controller',
    name: 'Game Joy',
    emoji: '🎮',
    description: 'Finish an Islamic game',
    rarity: 'common',
    triggers: ['game_complete'],
  },
  {
    id: 'streak_flame',
    name: 'Streak Flame',
    emoji: '🔥',
    description: 'Reach a 3-day family streak',
    rarity: 'rare',
    triggers: ['streak_3'],
  },
  {
    id: 'surprise_star',
    name: 'Surprise Star',
    emoji: '⭐',
    description: 'Open the daily surprise box',
    rarity: 'common',
    triggers: ['daily_surprise'],
  },
  {
    id: 'mosque_tile',
    name: 'Mosque Tile',
    emoji: '🕌',
    description: 'Save your first artwork to My Gallery',
    rarity: 'rare',
    triggers: ['gallery_save'],
  },
  {
    id: 'scholar_badge',
    name: 'Little Scholar',
    emoji: '📚',
    description: 'Earn 100 points in one day',
    rarity: 'legendary',
    triggers: ['points_100_day'],
  },
  {
    id: 'avatar_cape',
    name: 'Hero Cape',
    emoji: '🦸',
    description: 'Unlock your first avatar outfit',
    rarity: 'rare',
    triggers: ['avatar_unlock'],
  },
  {
    id: 'family_team',
    name: 'Family Team',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Help finish a weekly family challenge',
    rarity: 'legendary',
    triggers: ['family_challenge'],
  },
];

export function getStickerById(id: string): StickerDef | undefined {
  return STICKER_CATALOG.find((s) => s.id === id);
}

export function stickersForTriggers(triggers: string[]): StickerDef[] {
  const set = new Set(triggers);
  return STICKER_CATALOG.filter((s) => s.triggers.some((t) => set.has(t)));
}
