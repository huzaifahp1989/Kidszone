'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { isTestModeEmail } from '@/lib/test-mode';
import { MapPin, Sparkles } from 'lucide-react';

function hasValidAge(age: unknown): boolean {
  const n = typeof age === 'number' ? age : Number(age);
  return Number.isFinite(n) && n >= 1 && n <= 120;
}

function hasValidCity(city: unknown): boolean {
  return typeof city === 'string' && city.trim().length >= 2;
}

const SKIP_PATHS = ['/signin', '/signup', '/profile', '/admin'];

/** Blocks play until age and city are saved on the learner profile. */
export function AgeRequiredGate() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const pathname = usePathname() || '/';
  const isTestModeUser = isTestModeEmail(user?.email);

  const needsAge = !hasValidAge(profile?.age);
  const needsCity = !hasValidCity(profile?.city);

  const [ageInput, setAgeInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidAge(profile?.age)) {
      setAgeInput(String(profile?.age));
    }
    if (hasValidCity(profile?.city)) {
      setCityInput(String(profile?.city).trim());
    }
  }, [profile?.age, profile?.city]);

  const skipRoute = useMemo(
    () => SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
    [pathname]
  );

  const needsDetails =
    !loading &&
    Boolean(user) &&
    Boolean(profile) &&
    !isTestModeUser &&
    !skipRoute &&
    (needsAge || needsCity);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);

    const ageNumber = Number(ageInput);
    if (!ageInput.trim() || Number.isNaN(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    const trimmedCity = cityInput.trim();
    if (trimmedCity.length < 2) {
      setError('Please enter your city or town (at least 2 letters).');
      return;
    }

    setSaving(true);
    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { age: ageNumber, city: trimmedCity },
      });
      if (metaErr) {
        console.warn('Could not update auth metadata:', metaErr.message);
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({ age: ageNumber, city: trimmedCity })
        .eq('uid', user.id);

      if (updateErr) {
        // Fallback if only `town` / `location` exist on older schemas
        if (updateErr.code === '42703') {
          let saved = false;
          for (const col of ['town', 'location'] as const) {
            const { error: altErr } = await supabase
              .from('users')
              .update({ age: ageNumber, [col]: trimmedCity })
              .eq('uid', user.id);
            if (!altErr) {
              saved = true;
              break;
            }
            if (altErr.code !== '42703') throw altErr;
          }
          if (!saved) {
            const { error: ageOnlyErr } = await supabase
              .from('users')
              .update({ age: ageNumber })
              .eq('uid', user.id);
            if (ageOnlyErr) throw ageOnlyErr;
            throw new Error(
              'City could not be saved. Please ask an admin to add the city column, or update your profile later.'
            );
          }
        } else {
          throw updateErr;
        }
      }

      await refreshProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save your details.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!needsDetails) return null;

  const title =
    needsAge && needsCity
      ? 'Add your age and city'
      : needsAge
        ? 'How old are you?'
        : 'Which city are you in?';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-gate-title"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-violet-200 bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
          <Sparkles size={14} />
          Required to continue
        </div>
        <h2 id="profile-gate-title" className="font-heading text-2xl font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We need your age so quizzes and games match you, and your city so prizes and leaderboards work fairly.
        </p>

        <form onSubmit={onSave} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Your age</span>
            <input
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-full rounded-xl border-2 border-violet-200 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-violet-500"
              placeholder="e.g. 8"
              autoFocus={needsAge}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MapPin size={14} className="text-violet-600" />
              City / town
            </span>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full rounded-xl border-2 border-violet-200 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-violet-500"
              placeholder="e.g. Birmingham"
              autoFocus={!needsAge && needsCity}
              required
              minLength={2}
              maxLength={80}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-base font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
