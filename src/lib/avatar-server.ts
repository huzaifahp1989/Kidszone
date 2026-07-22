import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  AVATAR_ITEMS,
  DEFAULT_AVATAR_LOADOUT,
  type AvatarLoadout,
} from '@/data/avatar-items';
import { getUnlockedStickerIds, unlockStickersForTriggers } from '@/lib/stickers-server';

export type AvatarState = {
  unlockedItems: string[];
  loadout: AvatarLoadout;
  catalog: Array<{
    id: string;
    name: string;
    emoji: string;
    slot: string;
    costPoints: number;
    unlocked: boolean;
    canUnlock: boolean;
  }>;
};

async function readAvatarRow(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('kids_zone_avatar')
    .select('unlocked_items, loadout')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== '42P01' && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAvatarState(userId: string): Promise<AvatarState> {
  const stickers = new Set(await getUnlockedStickerIds(userId));
  const row = await readAvatarRow(userId).catch(() => null);

  const unlockedItems = Array.isArray(row?.unlocked_items)
    ? row!.unlocked_items.map(String)
    : ['hat_cap', 'outfit_tee'];
  const unlockedSet = new Set(unlockedItems);

  const loadout: AvatarLoadout = {
    ...DEFAULT_AVATAR_LOADOUT,
    ...(row?.loadout && typeof row.loadout === 'object' ? (row.loadout as AvatarLoadout) : {}),
  };

  const catalog = AVATAR_ITEMS.map((item) => {
    const unlocked = unlockedSet.has(item.id);
    const stickerOk = item.requiresStickerId === 'free' || stickers.has(item.requiresStickerId);
    return {
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      slot: item.slot,
      costPoints: item.costPoints,
      unlocked,
      canUnlock: !unlocked && stickerOk,
    };
  });

  return { unlockedItems, loadout, catalog };
}

export async function unlockAvatarItem(userId: string, itemId: string) {
  const item = AVATAR_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false as const, message: 'Unknown item' };

  const state = await getAvatarState(userId);
  if (state.unlockedItems.includes(itemId)) {
    return { ok: true as const, message: 'Already unlocked', state };
  }

  const entry = state.catalog.find((c) => c.id === itemId);
  if (!entry?.canUnlock) {
    return { ok: false as const, message: 'Collect the required sticker first', state };
  }

  if (item.costPoints > 0) {
    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points')
      .eq('user_id', userId)
      .maybeSingle();
    const total = Number(pointsRow?.total_points || 0);
    if (total < item.costPoints) {
      return { ok: false as const, message: 'Not enough points', state };
    }
    await supabaseAdmin
      .from('users_points')
      .update({
        total_points: total - item.costPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  const nextUnlocked = [...new Set([...state.unlockedItems, itemId, 'hat_cap', 'outfit_tee'])];
  const { error } = await supabaseAdmin.from('kids_zone_avatar').upsert(
    {
      user_id: userId,
      unlocked_items: nextUnlocked,
      loadout: state.loadout,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    if (error.code === '42P01') {
      return {
        ok: false as const,
        message: 'Avatar table not set up. Run ADD_KIDS_ZONE_ENGAGEMENT.sql',
        state,
      };
    }
    throw error;
  }

  await unlockStickersForTriggers(userId, ['avatar_unlock']);
  const refreshed = await getAvatarState(userId);
  return { ok: true as const, message: `Unlocked ${item.name}!`, state: refreshed };
}

export async function setAvatarLoadout(userId: string, loadout: Partial<AvatarLoadout>) {
  const state = await getAvatarState(userId);
  const next: AvatarLoadout = { ...state.loadout };
  for (const slot of ['hat', 'outfit', 'prop', 'room'] as const) {
    const value = loadout[slot];
    if (value && state.unlockedItems.includes(value)) next[slot] = value;
  }

  const { error } = await supabaseAdmin.from('kids_zone_avatar').upsert(
    {
      user_id: userId,
      unlocked_items: state.unlockedItems,
      loadout: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  return getAvatarState(userId);
}
