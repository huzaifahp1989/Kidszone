'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authFetch, authJsonFetch } from '@/lib/auth-headers';
import { AVATAR_ITEMS } from '@/data/avatar-items';

type CatalogItem = {
  id: string;
  name: string;
  emoji: string;
  slot: string;
  costPoints: number;
  unlocked: boolean;
  canUnlock: boolean;
};

type Loadout = { hat: string; outfit: string; prop: string; room: string };

export function AvatarCustomizer() {
  const { user, refreshProfile } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const res = await authFetch(`/api/kids-zone/avatar?userId=${user.id}`);
    const data = await res.json();
    if (res.ok) {
      setCatalog(data.catalog || []);
      setLoadout(data.loadout || null);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const emojiFor = (id: string) => AVATAR_ITEMS.find((i) => i.id === id)?.emoji || '⭐';

  const unlock = async (itemId: string) => {
    if (!user?.id) return;
    const res = await authJsonFetch('/api/kids-zone/avatar', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id, action: 'unlock', itemId }),
    });
    const data = await res.json();
    setMessage(data.message || null);
    if (data.state) {
      setCatalog(data.state.catalog || []);
      setLoadout(data.state.loadout || null);
      await refreshProfile();
    } else await load();
  };

  const equip = async (slot: keyof Loadout, itemId: string) => {
    if (!user?.id || !loadout) return;
    const next = { ...loadout, [slot]: itemId };
    const res = await authJsonFetch('/api/kids-zone/avatar', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id, action: 'equip', loadout: next }),
    });
    const data = await res.json();
    if (res.ok) {
      setLoadout(data.loadout || next);
      setCatalog(data.catalog || catalog);
    }
  };

  if (!user?.id) return null;

  return (
    <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5">
      <h3 className="font-heading text-xl font-extrabold text-sand-900">My Avatar Room</h3>
      <p className="mt-1 text-sm text-sand-600">Unlock outfits with stickers and points, then dress up!</p>

      {loadout && (
        <div className="mt-4 flex items-center justify-center gap-3 rounded-3xl border border-teal-100 bg-white py-6 text-5xl">
          <span title="Room">{emojiFor(loadout.room)}</span>
          <span title="Hat">{emojiFor(loadout.hat)}</span>
          <span title="Outfit">{emojiFor(loadout.outfit)}</span>
          <span title="Prop">{emojiFor(loadout.prop)}</span>
        </div>
      )}

      {message && <p className="mt-2 text-sm font-semibold text-teal-800">{message}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {catalog.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
              item.unlocked ? 'border-teal-200 bg-white' : 'border-sand-200 bg-sand-50'
            }`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-sand-900">{item.name}</p>
              <p className="text-[11px] font-semibold uppercase text-sand-500">
                {item.slot}
                {item.costPoints > 0 ? ` · ${item.costPoints} pts` : ''}
              </p>
            </div>
            {item.unlocked ? (
              <button
                type="button"
                onClick={() => equip(item.slot as keyof Loadout, item.id)}
                className="rounded-lg bg-teal-700 px-2 py-1 text-xs font-bold text-white"
              >
                Wear
              </button>
            ) : (
              <button
                type="button"
                disabled={!item.canUnlock}
                onClick={() => unlock(item.id)}
                className="rounded-lg border border-teal-300 px-2 py-1 text-xs font-bold text-teal-800 disabled:opacity-40"
              >
                Unlock
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
