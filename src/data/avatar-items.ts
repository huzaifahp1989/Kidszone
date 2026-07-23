export type AvatarItem = {
  id: string;
  name: string;
  emoji: string;
  slot: 'hat' | 'outfit' | 'prop' | 'room';
  /** Sticker id required to unlock, or 'free' */
  requiresStickerId: string | 'free';
  costPoints: number;
};

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'hat_cap', name: 'Sunny Cap', emoji: '🧢', slot: 'hat', requiresStickerId: 'free', costPoints: 0 },
  { id: 'hat_crown', name: 'Kind Crown', emoji: '👑', slot: 'hat', requiresStickerId: 'streak_flame', costPoints: 20 },
  { id: 'outfit_tee', name: 'Teal Tee', emoji: '👕', slot: 'outfit', requiresStickerId: 'free', costPoints: 0 },
  { id: 'outfit_cape', name: 'Hero Cape', emoji: '🦸', slot: 'outfit', requiresStickerId: 'palette_star', costPoints: 30 },
  { id: 'prop_book', name: 'Quran Book', emoji: '📖', slot: 'prop', requiresStickerId: 'dua_hands', costPoints: 15 },
  { id: 'prop_lantern', name: 'Ramadan Lantern', emoji: '🏮', slot: 'prop', requiresStickerId: 'surprise_star', costPoints: 25 },
  { id: 'room_stars', name: 'Starry Room', emoji: '🌌', slot: 'room', requiresStickerId: 'crescent_glow', costPoints: 40 },
  { id: 'room_masjid', name: 'Masjid View', emoji: '🕌', slot: 'room', requiresStickerId: 'mosque_tile', costPoints: 50 },
];

export type AvatarLoadout = {
  hat: string;
  outfit: string;
  prop: string;
  room: string;
};

export const DEFAULT_AVATAR_LOADOUT: AvatarLoadout = {
  hat: 'hat_cap',
  outfit: 'outfit_tee',
  prop: 'prop_book',
  room: 'room_stars',
};
