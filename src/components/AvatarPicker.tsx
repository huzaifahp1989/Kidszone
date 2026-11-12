'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import { AVATARS, DEFAULT_AVATAR_ID, getAvatar } from '@/data/avatars';
import { levelFromPoints, levelProgress } from '@/lib/levels';

type AvatarApiResponse = {
  avatarId?: string;
  level?: number;
  points?: number;
  ok?: boolean;
  error?: string;
};

export function AvatarPicker() {
  const { user, profile, updateLocalProfile } = useAuth();
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const points = profile?.points ?? 0;
  const progress = levelProgress(points);
  const level = progress.level;
  const currentAvatar = getAvatar(avatarId) ?? getAvatar(DEFAULT_AVATAR_ID)!;

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch('/api/me/avatar', { cache: 'no-store', headers });
      const data: AvatarApiResponse = await res.json().catch(() => ({}));
      if (res.ok && data.avatarId) {
        setAvatarId(data.avatarId);
      }
    } catch {
      setError('Could not load your avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectAvatar = async (id: string) => {
    if (savingId || id === avatarId) return;
    setSavingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarId: id }),
      });
      const data: AvatarApiResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Could not save your avatar.');
      }
      setAvatarId(data.avatarId || id);
      updateLocalProfile({ avatarId: data.avatarId || id });
      setMessage('Avatar updated! Looking great 🌟');
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Could not save your avatar.');
    } finally {
      setSavingId(null);
    }
  };

  if (!user && !loading) {
    return (
      <div className="rounded-3xl border border-teal-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Sign in to pick your avatar and track your level.</p>
        <Link
          href="/signin"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-500"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-6xl shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
            {currentAvatar.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              {profile?.name || 'Your avatar'}
            </p>
            <p className="mt-1 text-2xl font-black">
              Level {level}
              <span className="ml-2 rounded-full bg-amber-300/90 px-3 py-1 text-sm font-black text-teal-950">
                {progress.title}
              </span>
            </p>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-teal-100">
                <span>
                  {progress.xpIntoLevel} / {progress.xpForLevel} XP
                </span>
                <span>{progress.nextLevelXp - points} XP to level {level + 1}</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.xpForLevel}
                aria-valuenow={progress.xpIntoLevel}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all"
                  style={{ width: `${Math.round(progress.progressRatio * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {message && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-teal-600" />
          <h2 className="text-lg font-black text-slate-900">Choose your avatar</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-teal-100 bg-white py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading your avatars…
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {AVATARS.map((avatar) => {
              const unlocked = avatar.unlockLevel <= level;
              const selected = avatar.id === avatarId;
              const saving = savingId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => unlocked && void selectAvatar(avatar.id)}
                  disabled={!unlocked || savingId !== null}
                  aria-pressed={selected}
                  aria-label={unlocked ? `Choose ${avatar.name}` : `${avatar.name} locked until level ${avatar.unlockLevel}`}
                  className={`relative flex min-h-11 flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                    selected
                      ? 'border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-300'
                      : unlocked
                        ? 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50'
                  }`}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">
                      <Check size={12} strokeWidth={4} />
                    </span>
                  )}
                  <span className={`text-3xl ${unlocked ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                    {avatar.emoji}
                  </span>
                  <span className={`text-xs font-bold ${unlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                    {avatar.name}
                  </span>
                  {!unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <Lock size={10} /> Reach level {avatar.unlockLevel}
                    </span>
                  ) : saving ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
                      <Loader2 size={10} className="animate-spin" /> Saving…
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs text-teal-800">
          Earn points every day to level up and unlock more avatars. You are level {levelFromPoints(points)} — keep
          going! 🌙
        </p>
      </section>
    </div>
  );
}
