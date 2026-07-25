'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { authFetch } from '@/lib/auth-headers';
import { useAgeMode } from '@/lib/age-mode';

type StickerItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: string;
  unlocked: boolean;
};

export function StickerBook({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { isYounger } = useAgeMode();
  const [items, setItems] = useState<StickerItem[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authFetch(`/api/kids-zone/stickers?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnlockedCount(Number(data.unlockedCount || 0));
        setTotal(Number(data.total || 0));
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.id) {
    return (
      <p className="text-sm text-sand-600">Sign in to collect stickers.</p>
    );
  }

  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-heading text-xl font-extrabold text-sand-900">
            {isYounger ? 'My Stickers' : 'Sticker Book'}
          </h3>
          <p className="text-sm text-sand-600">
            {unlockedCount}/{total} collected{!isYounger ? ` · ${pct}%` : ''}
          </p>
        </div>
      </div>
      <div
        className={`grid gap-2 ${
          isYounger || compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4 sm:grid-cols-5'
        }`}
      >
        {items.map((s) => (
          <motion.div
            key={s.id}
            whileHover={s.unlocked ? { scale: 1.05 } : undefined}
            className={`flex flex-col items-center rounded-2xl border p-3 text-center ${
              s.unlocked
                ? 'border-violet-300 bg-white shadow-sm'
                : 'border-sand-200 bg-sand-50 opacity-60'
            }`}
          >
            <span className={`${isYounger ? 'text-4xl' : 'text-3xl'}`} aria-hidden>
              {s.unlocked ? s.emoji : '🔒'}
            </span>
            <span className="mt-1 text-xs font-extrabold text-sand-900">{s.unlocked ? s.name : '???'}</span>
            {!compact && s.unlocked && (
              <span className="mt-0.5 text-[10px] font-semibold uppercase text-violet-700">{s.rarity}</span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
