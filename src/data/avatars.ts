/**
 * Collectible emoji avatars for kids.
 * Emoji-only on purpose — no image assets to download or store, and no personal data.
 */

export interface Avatar {
  /** Stable id used in the database (users.avatar_id). */
  id: string;
  /** The emoji shown to the child. */
  emoji: string;
  /** Friendly name shown under the avatar. */
  name: string;
  /** Level (from levels.ts) the child must reach before they can pick it. */
  unlockLevel: number;
  /** Optional colour theme for the picker card. */
  theme?: string;
}

/** The avatar every learner starts with. */
export const DEFAULT_AVATAR_ID = 'moon';

export const AVATARS: Avatar[] = [
  { id: 'moon', emoji: '🌙', name: 'Crescent Moon', unlockLevel: 1, theme: 'teal' },
  { id: 'star', emoji: '⭐', name: 'Shining Star', unlockLevel: 1, theme: 'amber' },
  { id: 'mosque', emoji: '🕌', name: 'Masjid', unlockLevel: 1, theme: 'emerald' },
  { id: 'book', emoji: '📖', name: 'Quran Book', unlockLevel: 1, theme: 'violet' },
  { id: 'camel', emoji: '🐪', name: 'Desert Camel', unlockLevel: 1, theme: 'sand' },
  { id: 'bird', emoji: '🐦', name: 'Little Bird', unlockLevel: 1, theme: 'sky' },
  { id: 'palm', emoji: '🌴', name: 'Palm Tree', unlockLevel: 1, theme: 'emerald' },
  { id: 'glow-star', emoji: '🌟', name: 'Glowing Star', unlockLevel: 1, theme: 'amber' },
  { id: 'sun', emoji: '☀️', name: 'Morning Sun', unlockLevel: 1, theme: 'amber' },
  { id: 'heart', emoji: '🤍', name: 'Pure Heart', unlockLevel: 1, theme: 'rose' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow', unlockLevel: 1, theme: 'violet' },
  { id: 'lion', emoji: '🦁', name: 'Brave Lion', unlockLevel: 2, theme: 'amber' },
  { id: 'tasbih', emoji: '📿', name: 'Tasbih Beads', unlockLevel: 2, theme: 'emerald' },
  { id: 'dove', emoji: '🕊️', name: 'Peaceful Dove', unlockLevel: 2, theme: 'sky' },
  { id: 'target', emoji: '🎯', name: 'Good Aim', unlockLevel: 2, theme: 'rose' },
  { id: 'kaaba', emoji: '🕋', name: 'The Kaaba', unlockLevel: 3, theme: 'sand' },
  { id: 'compass', emoji: '🧭', name: 'Explorer Compass', unlockLevel: 3, theme: 'teal' },
  { id: 'rocket', emoji: '🚀', name: 'Rising Rocket', unlockLevel: 4, theme: 'sky' },
  { id: 'trophy', emoji: '🏆', name: 'Champion Trophy', unlockLevel: 5, theme: 'amber' },
  { id: 'crown', emoji: '👑', name: 'Crown of Knowledge', unlockLevel: 6, theme: 'violet' },
];

/** Look up an avatar by id. Returns undefined for unknown ids. */
export function getAvatar(id: string | null | undefined): Avatar | undefined {
  if (!id) return undefined;
  return AVATARS.find((avatar) => avatar.id === id);
}

/** Every avatar a learner at the given level has unlocked. */
export function avatarsUnlockedAtLevel(level: number): Avatar[] {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return AVATARS.filter((avatar) => avatar.unlockLevel <= safeLevel);
}
