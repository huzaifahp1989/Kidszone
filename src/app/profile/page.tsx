'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { NotificationSettings } from '@/components/NotificationSettings';
import { AchievementGrid } from '@/components/AchievementGrid';
import { StreakCalendar } from '@/components/StreakCalendar';
import { getKidLevelTitle } from '@/lib/level-names';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';
import { useAgeMode } from '@/lib/age-mode';
import { MAX_FAMILY_MEMBERS, normalizeUsername } from '@/lib/family-accounts';

type FamilyMemberRow = {
  uid: string;
  username: string;
  name: string;
  age: number;
};

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { mode: ageMode, setMode: setAgeMode } = useAgeMode();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [city, setCity] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | '3x_week' | 'weekly'>('weekly');
  const [saving, setSaving] = useState(false);
  const [generatingParentLink, setGeneratingParentLink] = useState(false);
  const [secureParentLink, setSecureParentLink] = useState<string | null>(null);
  const [secureParentLinkExpiry, setSecureParentLinkExpiry] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userPoints, setUserPoints] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>([]);
  const [siblingName, setSiblingName] = useState('');
  const [siblingUsername, setSiblingUsername] = useState('');
  const [siblingAge, setSiblingAge] = useState('');
  const [siblingPassword, setSiblingPassword] = useState('');
  const [addingSibling, setAddingSibling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const msg = new URLSearchParams(window.location.search).get('message');
    if (msg) setMessage(msg);
  }, []);

  useEffect(() => {
    async function fetchPoints() {
      if (user?.id) {
        const { data } = await supabase.from('users_points').select('*').eq('user_id', user.id).single();
        if (data) setUserPoints(data);
      }
    }
    fetchPoints();
  }, [user?.id, profile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setAge(typeof profile.age === 'number' ? profile.age : '');
      setCity(profile.city ?? '');
      setParentEmail(profile.parentEmail ?? profile.familyEmail ?? profile.email ?? user?.email ?? '');
      setReminderOptIn(Boolean(profile.reminderOptIn));
      setReminderFrequency(profile.reminderFrequency ?? 'weekly');
    }
  }, [profile, user?.email]);

  const loadFamilyMembers = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch('/api/family/members', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setFamilyMembers(Array.isArray(payload.members) ? payload.members : []);
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  const canEdit = useMemo(() => !!user?.id, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadFamilyMembers();
    setRefreshing(false);
    setMessage('Profile refreshed!');
    setTimeout(() => setMessage(null), 2000);
  };

  const createIfMissing = async () => {
    if (!user?.id) return;
    setError(null);
    setMessage(null);
    const ok = await ensureUserProfile(user.id);
    if (ok) {
      setMessage('Profile ensured. If not visible, refresh once.');
    } else {
      setError('Could not create profile (RLS or auth issue). Try reloading and signing in again.');
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);
    setMessage(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (age === '' || Number.isNaN(age)) {
      setError('Please enter your age.');
      return;
    }
    const ageNumber = Number(age);
    if (ageNumber < 1 || ageNumber > 120) {
      setError('Please enter a valid age.');
      return;
    }
    const trimmedCity = city.trim();
    if (trimmedCity.length < 2) {
      setError('Please enter your city or town.');
      return;
    }
    const cleanedParentEmail = parentEmail.trim().toLowerCase();
    if (reminderOptIn && !cleanedParentEmail) {
      setError('Please provide a parent email to enable reminders.');
      return;
    }
    setSaving(true);
    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { name: trimmedName, age: ageNumber, city: trimmedCity },
      });
      if (metaErr) {
        console.warn('Could not update auth metadata:', metaErr.message);
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          age: ageNumber,
          city: trimmedCity,
          parent_email: cleanedParentEmail || null,
          reminder_opt_in: reminderOptIn,
          reminder_frequency: reminderFrequency,
          reminder_unsubscribed_at: reminderOptIn ? null : new Date().toISOString(),
        })
        .eq('uid', user.id);

      if (updateErr) {
        if (updateErr.code === '42703') {
          // Older schemas may use town/location instead of city
          let saved = false;
          for (const col of ['town', 'location'] as const) {
            const { error: altErr } = await supabase
              .from('users')
              .update({
                name: trimmedName,
                age: ageNumber,
                [col]: trimmedCity,
                parent_email: cleanedParentEmail || null,
                reminder_opt_in: reminderOptIn,
                reminder_frequency: reminderFrequency,
                reminder_unsubscribed_at: reminderOptIn ? null : new Date().toISOString(),
              })
              .eq('uid', user.id);
            if (!altErr) {
              saved = true;
              break;
            }
            if (altErr.code !== '42703') throw altErr;
          }
          if (!saved) throw updateErr;
        } else {
          throw updateErr;
        }
      }

      await refreshProfile();
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const onAddSibling = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.id) return;
    setError(null);
    setMessage(null);

    const trimmedName = siblingName.trim();
    const username = normalizeUsername(siblingUsername);
    if (!trimmedName) {
      setError('Please enter your brother or sister’s name.');
      return;
    }
    if (!username) {
      setError('Please choose a username for them.');
      return;
    }
    if (!siblingAge.trim()) {
      setError('Please enter their age.');
      return;
    }
    if (siblingPassword.length < 6) {
      setError('Enter the family password (at least 6 characters) to add them.');
      return;
    }

    setAddingSibling(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again.');

      const res = await fetch('/api/family/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          username,
          age: siblingAge.trim(),
          password: siblingPassword,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Could not add family member.');

      setSiblingName('');
      setSiblingUsername('');
      setSiblingAge('');
      setSiblingPassword('');
      await loadFamilyMembers();
      setMessage(
        `Added ${payload?.member?.name || trimmedName}. They can sign in with username “${payload?.member?.username || username}” and the family password.`
      );
    } catch (err: any) {
      setError(err?.message || 'Could not add brother or sister.');
    } finally {
      setAddingSibling(false);
    }
  };

  const generateSecureParentLink = async () => {
    if (!user?.id) return;

    setGeneratingParentLink(true);
    setError(null);
    setMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Please sign in again to generate a secure parent link.');
      }

      const res = await fetch('/api/parent/progress-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          childId: user.id,
          parentEmail: parentEmail.trim().toLowerCase(),
          expiresInHours: 48,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to generate secure link');
      }

      setSecureParentLink(payload.link || null);
      setSecureParentLinkExpiry(payload.expiresAt || null);

      if (payload.link && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload.link);
        setMessage('Secure parent link generated and copied to clipboard.');
      } else {
        setMessage('Secure parent link generated.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not generate secure parent link.');
    } finally {
      setGeneratingParentLink(false);
    }
  };

  if (!user && loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Profile</h1>
          <p className="text-gray-600 mb-4">You need to sign in to view your profile.</p>
          <Link href="/signin" className="text-islamic-blue font-semibold hover:underline">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Your Profile</h1>
        <p className="text-center text-gray-600 mb-6">Manage your details and see your progress</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
        {message && <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div>}

        {!profile && (
          <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-gray-700">
            No profile found yet. You can create it now.
            <div className="mt-3">
              <Button onClick={createIfMissing}>Create Profile</Button>
            </div>
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Family email</label>
            <input
              type="email"
              value={profile?.familyEmail || profile?.email || ''}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use this email or your username to sign in. Brothers and sisters can share it.
            </p>
          </div>

          {profile?.username ? (
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={profile.username}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              disabled={!canEdit}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">City / town</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              disabled={!canEdit}
              placeholder="e.g. Birmingham"
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="rounded-lg border border-violet-200 p-4 bg-violet-50/50">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Reading mode</h2>
            <p className="text-xs text-gray-600 mb-3">
              Pick how the app looks. &quot;Younger&quot; makes text and buttons bigger and turns on read-aloud.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAgeMode('younger')}
                aria-pressed={ageMode === 'younger'}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  ageMode === 'younger'
                    ? 'border-violet-500 bg-white shadow-sm ring-1 ring-violet-300'
                    : 'border-gray-200 bg-white hover:border-violet-300'
                }`}
              >
                <span className="block text-2xl">🧸</span>
                <span className="mt-1 block text-sm font-bold text-gray-900">Younger</span>
                <span className="block text-xs text-gray-500">Bigger, simpler, read-aloud on</span>
              </button>
              <button
                type="button"
                onClick={() => setAgeMode('older')}
                aria-pressed={ageMode === 'older'}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  ageMode === 'older'
                    ? 'border-violet-500 bg-white shadow-sm ring-1 ring-violet-300'
                    : 'border-gray-200 bg-white hover:border-violet-300'
                }`}
              >
                <span className="block text-2xl">🎓</span>
                <span className="mt-1 block text-sm font-bold text-gray-900">Older</span>
                <span className="block text-xs text-gray-500">The full experience</span>
              </button>
            </div>
          </div>

          <NotificationSettings />

          <div className="rounded-lg border border-emerald-200 p-4 bg-emerald-50/40">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Brothers &amp; sisters</h2>
            <p className="text-xs text-gray-600 mb-3">
              Add up to {MAX_FAMILY_MEMBERS} learners on this family email. Each child gets their own username, age, and
              points. Sign in with the family email (then pick a name) or with their username.
            </p>

            {familyMembers.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {familyMembers.map((member) => (
                  <li
                    key={member.uid}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-gray-900">
                      {member.name}
                      {member.uid === user.id ? (
                        <span className="ml-2 text-xs font-medium text-emerald-700">(you)</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-gray-600">
                      @{member.username || '—'} · age {member.age || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-xs text-gray-500">Only you are on this family email so far.</p>
            )}

            {familyMembers.length < MAX_FAMILY_MEMBERS ? (
              <div className="space-y-3 rounded-lg border border-dashed border-emerald-300 bg-white/80 p-3">
                <p className="text-xs font-semibold text-emerald-900">Add brother or sister</p>
                <div>
                  <label className="block text-xs font-medium mb-1">Their name</label>
                  <input
                    type="text"
                    value={siblingName}
                    onChange={(e) => setSiblingName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. Yusuf"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={siblingUsername}
                    onChange={(e) => setSiblingUsername(normalizeUsername(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. yusuf_k"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Age</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={siblingAge}
                    onChange={(e) => setSiblingAge(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. 8"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Family password</label>
                  <input
                    type="password"
                    value={siblingPassword}
                    onChange={(e) => setSiblingPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Same password you use to sign in"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="button" onClick={() => { void onAddSibling(); }} disabled={addingSibling} className="w-full">
                  {addingSibling ? 'Adding…' : 'Add brother or sister'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-amber-800">This family already has the maximum of {MAX_FAMILY_MEMBERS} learners.</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4 bg-teal-50/40">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Parent Reminder Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Parent email for reminders</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                  disabled={!canEdit}
                  placeholder="parent@example.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="reminder-opt-in"
                  type="checkbox"
                  checked={reminderOptIn}
                  onChange={(e) => setReminderOptIn(e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4"
                />
                <label htmlFor="reminder-opt-in" className="text-sm text-gray-800">
                  Send return reminders to parent
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reminder frequency</label>
                <select
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value as 'daily' | '3x_week' | 'weekly')}
                  disabled={!canEdit || !reminderOptIn}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                >
                  <option value="weekly">Weekly</option>
                  <option value="3x_week">3 times per week</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              {user?.id ? (
                <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3">
                  <p className="text-xs text-cyan-800 font-semibold">Parent progress view (one-time secure link)</p>
                  <p className="text-xs text-cyan-700 mt-1">Generate a single-use link that expires in 48 hours.</p>
                  <button
                    type="button"
                    onClick={generateSecureParentLink}
                    disabled={generatingParentLink}
                    className="mt-2 inline-flex items-center rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                  >
                    {generatingParentLink ? 'Generating...' : 'Generate Secure Parent Link'}
                  </button>

                  {secureParentLink ? (
                    <div className="mt-2 rounded-md border border-cyan-200 bg-white p-2">
                      <p className="text-[11px] text-cyan-800 break-all">{secureParentLink}</p>
                      {secureParentLinkExpiry ? (
                        <p className="mt-1 text-[11px] text-cyan-600">
                          Expires: {new Date(secureParentLinkExpiry).toLocaleString()}
                        </p>
                      ) : null}
                      <Link
                        href={secureParentLink}
                        className="mt-2 inline-flex items-center rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-bold text-cyan-700 hover:bg-cyan-100"
                      >
                        Open Secure Link
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="text-center rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-gray-600">Total Points</div>
              <div className="text-xl font-bold text-islamic-blue">{userPoints?.total_points ?? profile?.points ?? 0}</div>
            </div>
            <div className="text-center rounded-lg bg-green-50 p-3">
              <div className="text-xs text-gray-600">Daily Points</div>
              <div className="text-xl font-bold text-islamic-green">
                {userPoints?.today_points ?? profile?.todayPoints ?? 0}/{POINTS_DAILY_CAP}
              </div>
            </div>
            <div className="text-center rounded-lg bg-yellow-50 p-3">
              <div className="text-xs text-gray-600">Badges</div>
              <div className="text-xl font-bold text-yellow-600">🏆 {userPoints?.badges ?? profile?.badges ?? 0}</div>
            </div>
            <div className="text-center rounded-lg bg-purple-50 p-3">
              <div className="text-xs text-gray-600">Level</div>
              <div className="text-xl font-bold text-purple-600">
                ⭐ {getKidLevelTitle(userPoints?.level ?? profile?.level ?? 1)}
              </div>
            </div>
          </div>

          <AchievementGrid />

          <StreakCalendar />

          <div className="pt-4">
            <Button type="button" disabled={refreshing} onClick={handleRefresh} variant="secondary" className="w-full mb-3">
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Stats'}
            </Button>
            <Button type="submit" disabled={!canEdit || saving} className="w-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
