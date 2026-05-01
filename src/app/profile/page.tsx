'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [parentEmail, setParentEmail] = useState('');
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | '3x_week' | 'weekly'>('weekly');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userPoints, setUserPoints] = useState<any>(null);

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
      setParentEmail((profile as any).parentEmail ?? profile.email ?? user?.email ?? '');
      setReminderOptIn(Boolean((profile as any).reminderOptIn));
      setReminderFrequency((((profile as any).reminderFrequency as 'daily' | '3x_week' | 'weekly') ?? 'weekly'));
    }
  }, [profile, user?.email]);

  const canEdit = useMemo(() => !!user?.id, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
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
    const cleanedParentEmail = parentEmail.trim().toLowerCase();
    if (reminderOptIn && !cleanedParentEmail) {
      setError('Please provide a parent email to enable reminders.');
      return;
    }
    setSaving(true);
    try {
      console.log('Updating profile:', { name, age, uid: user.id });
      const { error: metaErr } = await supabase.auth.updateUser({ data: { name: trimmedName } });
      if (metaErr) {
        console.warn('Could not update auth metadata name:', metaErr.message);
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          age: Number(age),
          parent_email: cleanedParentEmail || null,
          reminder_opt_in: reminderOptIn,
          reminder_frequency: reminderFrequency,
          reminder_unsubscribed_at: reminderOptIn ? null : new Date().toISOString(),
        })
        .eq('uid', user.id);
      
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Profile updated successfully');
      // Refresh profile to show changes immediately
      await refreshProfile();
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
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
          <Link href="/signin" className="text-islamic-blue font-semibold hover:underline">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Your Profile</h1>
        <p className="text-center text-gray-600 mb-6">Manage your details and see your progress</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div>
        )}

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
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2"
            />
          </div>

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
              min={5}
              max={14}
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              disabled={!canEdit}
            />
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
                <label htmlFor="reminder-opt-in" className="text-sm text-gray-800">Send return reminders to parent</label>
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
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="text-center rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-gray-600">Total Points</div>
              <div className="text-xl font-bold text-islamic-blue">{userPoints?.total_points ?? profile?.points ?? 0}</div>
            </div>
            <div className="text-center rounded-lg bg-green-50 p-3">
              <div className="text-xs text-gray-600">Daily Points</div>
              <div className="text-xl font-bold text-islamic-green">{userPoints?.today_points ?? profile?.todayPoints ?? 0}/100</div>
            </div>
            <div className="text-center rounded-lg bg-yellow-50 p-3">
              <div className="text-xs text-gray-600">Badges</div>
              <div className="text-xl font-bold text-yellow-600">🏆 {userPoints?.badges ?? profile?.badges ?? 0}</div>
            </div>
             <div className="text-center rounded-lg bg-purple-50 p-3">
              <div className="text-xs text-gray-600">Level</div>
              <div className="text-xl font-bold text-purple-600">⭐ {userPoints?.level ?? 1}</div>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="button" 
              disabled={refreshing}
              onClick={handleRefresh}
              variant="secondary"
              className="w-full mb-3"
            >
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
