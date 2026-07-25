import { supabaseAdmin } from '@/lib/supabase-admin';
import { STICKER_CATALOG, stickersForTriggers, type StickerDef } from '@/data/stickers';

export async function getUnlockedStickerIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('kids_zone_stickers')
      .select('sticker_id')
      .eq('user_id', userId);
    if (error) return [];
    return (data || []).map((r) => String(r.sticker_id));
  } catch {
    return [];
  }
}

export async function unlockStickersForTriggers(
  userId: string,
  triggers: string[]
): Promise<{ unlocked: StickerDef[]; newlyUnlockedIds: string[] }> {
  const candidates = stickersForTriggers(triggers);
  if (!candidates.length) return { unlocked: [], newlyUnlockedIds: [] };

  const existing = new Set(await getUnlockedStickerIds(userId));
  const toInsert = candidates.filter((s) => !existing.has(s.id));
  if (!toInsert.length) return { unlocked: [], newlyUnlockedIds: [] };

  const rows = toInsert.map((s) => ({ user_id: userId, sticker_id: s.id }));
  const { error } = await supabaseAdmin.from('kids_zone_stickers').upsert(rows, {
    onConflict: 'user_id,sticker_id',
    ignoreDuplicates: true,
  });

  if (error) {
    console.error('[stickers] unlock error', error.message);
    return { unlocked: [], newlyUnlockedIds: [] };
  }

  return { unlocked: toInsert, newlyUnlockedIds: toInsert.map((s) => s.id) };
}

export async function getStickerBook(userId: string) {
  const unlockedIds = await getUnlockedStickerIds(userId);
  const unlockedSet = new Set(unlockedIds);
  const items = STICKER_CATALOG.map((s) => ({
    ...s,
    unlocked: unlockedSet.has(s.id),
  }));
  return {
    total: STICKER_CATALOG.length,
    unlockedCount: unlockedIds.length,
    items,
  };
}
