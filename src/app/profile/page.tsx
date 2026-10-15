'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
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
import {
  CheckCircle2,
  Clock,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react';

type FamilyMemberRow = {
  uid: string;
  username: string;
  name: string;
  age: number;
};

type WeeklyCertificateCardProps = {
  userName: string;
  tier: string;
  rank: number;
  weekStart: string;
  weeklyPoints: number;
  weeklyScore: number;
  activityCount: number;
  badgesAtAward: number;
  issuedAt: string | null;
};

type UniversalCertificateProps = {
  kind: 'weekly' | 'monthly';
  category: string;
  date: string;
  userName: string;
  tier: string;
  rank: number;
  points: number;
  activity: number;
  activeWeeks: number;
  consecutiveMonths: number;
  badgesAtAward: number;
  pointsAwarded: number;
  issuedAt: string | null;
  issuedBy: string | null;
};

function tierStyle(tier: string) {
  switch (tier) {
    case 'gold':
      return {
        gradient: 'from-amber-400 via-yellow-300 to-orange-400',
        ring: 'ring-amber-300',
        medal: '🥇',
        label: 'Gold',
      };
    case 'silver':
      return {
        gradient: 'from-slate-200 via-slate-100 to-slate-300',
        ring: 'ring-slate-300',
        medal: '🥈',
        label: 'Silver',
      };
    case 'bronze':
      return {
        gradient: 'from-orange-300 via-amber-200 to-amber-400',
        ring: 'ring-amber-200',
        medal: '🥉',
        label: 'Bronze',
      };
    default:
      return {
        gradient: 'from-emerald-300 via-teal-200 to-sky-300',
        ring: 'ring-emerald-200',
        medal: '🏅',
        label: 'Participation',
      };
  }
}

function printElement(selector: string) {
  if (typeof window === 'undefined') return;
  const node = window.document.querySelector<HTMLElement>(selector);
  if (!node) return;
  const restore: Array<{ el: Element; display: string | null }> = [];
  window.document.querySelectorAll('body > *').forEach((el) => {
    const styles = window.getComputedStyle(el);
    restore.push({ el, display: styles.display });
    if (el !== node && !node.contains(el)) {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    }
  });
  node.classList.add('print-me');
  window.focus();
  window.print();
  node.classList.remove('print-me');
  restore.forEach((r) => {
    if (r.display == null) {
      (r.el as HTMLElement).style.removeProperty('display');
    } else {
      (r.el as HTMLElement).style.display = r.display;
    }
  });
}

function WeeklyCertificateCard(props: WeeklyCertificateCardProps) {
  const p: UniversalCertificateProps = {
    kind: 'weekly',
    category: 'weekly_participation',
    date: props.weekStart,
    userName: props.userName,
    tier: props.tier,
    rank: props.rank,
    points: props.weeklyPoints,
    activity: props.activityCount,
    activeWeeks: 1,
    consecutiveMonths: 0,
    badgesAtAward: props.badgesAtAward,
    pointsAwarded: 0,
    issuedAt: props.issuedAt,
    issuedBy: null,
  };
  return <CertificateCard {...p} weeklyScore={props.weeklyScore} />;
}

function categoryMeta(category: string) {
  switch (category) {
    case 'monthly_points':
      return { title: 'Monthly Points', subtitle: 'Monthly points leaderboard', emoji: '📈' };
    case 'always_active':
      return { title: 'Always Active', subtitle: 'Kids Zone regular', emoji: '🏃' };
    case 'weekly_participation':
      return { title: 'Weekly Certificate', subtitle: 'Weekly participation award', emoji: '🏅' };
    default:
      return { title: 'Certificate', subtitle: 'Achievement', emoji: '🎖️' };
  }
}

function CertificateCard(
  props: UniversalCertificateProps & { weeklyScore?: number }
) {
  const style = tierStyle(props.tier);
  const cat = categoryMeta(props.category);
  const label = props.kind === 'monthly' ? cat.title : 'Weekly certificate';
  const certId = `cert-${props.kind}-${btoa(
    unescape(encodeURIComponent(`${props.date}-${props.rank}-${props.tier}-${props.category}`))
  )
    .replace(/=/g, '')
    .slice(0, 40)}`;
  const dateLabel =
    props.kind === 'monthly'
      ? `Month of ${new Date(props.date + 'T00:00:00Z').toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
      : `Week starting ${props.date}`;
  const pointsLine = `${props.points.toLocaleString()} pts`;
  const activityLine = `${props.activity.toLocaleString()} activities`;
  const weeksLine = `${props.activeWeeks} active ${props.activeWeeks === 1 ? 'week' : 'weeks'}`;
  const onShare = async () => {
    const text = `I earned a ${style.label} ${label} (${dateLabel}) on the Islamic Kids Learning Platform! Rank #${props.rank} · ${pointsLine} · ${activityLine} 🎉`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${props.userName}'s ${style.label} ${label}`,
          text,
        });
        return;
      }
    } catch {
      /* fallthrough */
    }
    try {
      await navigator.clipboard.writeText(text);
      window.alert('Certificate details copied! Paste to share 📋');
    } catch {
      window.alert(text);
    }
  };

  return (
    <div
      id={certId}
      className={`relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-md ring-1 ring-inset ${style.ring}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-15`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              {cat.emoji} {label}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{cat.subtitle}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {style.medal} {style.label}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 border border-white px-3 py-2 text-right shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rank</p>
            <p className="text-xl font-black text-amber-600">#{props.rank}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white bg-white/80 p-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Awarded to
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{props.userName}</p>
          <p className="mt-2 text-xs text-slate-600">{dateLabel}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-white/70 px-2 py-2">
            <p className="font-bold text-slate-700">{pointsLine}</p>
            <p className="text-slate-500">Points</p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-2">
            <p className="font-bold text-slate-700">{activityLine}</p>
            <p className="text-slate-500">Activity</p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-2">
            <p className="font-bold text-slate-700">
              {props.kind === 'weekly' && typeof props.weeklyScore === 'number'
                ? `${props.weeklyScore}/7`
                : weeksLine}
            </p>
            <p className="text-slate-500">{props.kind === 'weekly' ? 'Days' : 'Active weeks'}</p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-2">
            <p className="font-bold text-slate-700">
              {props.kind === 'monthly' ? `${props.consecutiveMonths} mo` : '🏆 ' + (props.badgesAtAward || 0)}
            </p>
            <p className="text-slate-500">
              {props.kind === 'monthly' ? 'Streak' : 'Badges at award'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
          {props.pointsAwarded > 0 ? (
            <span className="font-bold text-emerald-700">+{props.pointsAwarded} pts awarded</span>
          ) : (
            <span>🏆 Badges at award: {props.badgesAtAward || 0}</span>
          )}
          {props.issuedAt ? (
            <span>{new Date(props.issuedAt).toLocaleDateString()}</span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => printElement(`#${certId}`)}
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            🖨️ Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onShare}
            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
          >
            📣 Share
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuelDate(iso: string | null | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return String(iso);
  }
}

function countdownDuel(iso: string | null | undefined) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return `${days}d ${hrs}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs >= 1) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

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
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certificatesMonthly, setCertificatesMonthly] = useState<any[]>([]);
  const [certificateCount, setCertificateCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificatesFilter, setCertificatesFilter] = useState<'all' | 'weekly' | 'monthly' | 'monthly_points' | 'always_active'>('all');
  const [myDuels, setMyDuels] = useState<any[]>([]);
  const [myDuelsLoading, setMyDuelsLoading] = useState(false);
  const [myDuelsStats, setMyDuelsStats] = useState({
    played: 0, won: 0, tied: 0, lost: 0, points: 0, badges: 0,
  });

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

  const loadCertificates = useCallback(async () => {
    if (!user?.id) return;
    setCertificatesLoading(true);
    try {
      const headers = await getAuthFetchHeaders();
      const [resOld, resUnified] = await Promise.all([
        fetch(`/api/my-weekly-certificates?userId=${user.id}&limit=30`, {
          cache: 'no-store',
          headers,
        }),
        fetch(`/api/my-certificates?userId=${user.id}&limit=30&kind=monthly`, {
          cache: 'no-store',
          headers,
        }),
      ]);
      const d1 = await resOld.json().catch(() => ({}));
      const d2 = await resUnified.json().catch(() => ({}));
      const weekly = Array.isArray(d1?.certificates) ? d1.certificates : [];
      const monthly = Array.isArray(d2?.monthly) ? d2.monthly : [];
      setCertificates(weekly);
      setCertificatesMonthly(monthly);
      setWeeklyCount(Number(d1?.count || weekly.length) || 0);
      setMonthlyCount(Number(d2?.monthlyCount || monthly.length) || 0);
      setCertificateCount(
        (Number(d1?.count || weekly.length) || 0) + (Number(d2?.monthlyCount || monthly.length) || 0)
      );
    } catch {
      // ignore
    } finally {
      setCertificatesLoading(false);
    }
  }, [user?.id]);

  const loadDuels = useCallback(async () => {
    if (!user?.id) return;
    setMyDuelsLoading(true);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/quran-duels/mine?userId=${user.id}&limit=50`, {
        cache: 'no-store',
        headers,
      });
      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json.duels) ? json.duels : [];
      setMyDuels(rows);
      let played = 0, won = 0, tied = 0, lost = 0, points = 0, badges = 0;
      for (const d of rows) {
        const asCreator = d.viewerRole === 'creator';
        const mySubmitted = asCreator ? d.creator?.submitted : d.opponent?.submitted;
        if (d.status === 'finished' && mySubmitted) played += 1;
        if (d.status === 'finished') {
          if (d.winnerId === user.id) { won += 1; }
          else if (d.isTie) { tied += 1; }
          else if (d.winnerId) { lost += 1; }
          points += Number(asCreator ? d.creator?.pointsAwarded : d.opponent?.pointsAwarded) || 0;
        }
      }
      setMyDuelsStats({ played, won, tied, lost, points, badges });
    } catch {
      // ignore
    } finally {
      setMyDuelsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    loadDuels();
  }, [loadDuels]);

  const canEdit = useMemo(() => !!user?.id, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadFamilyMembers();
    await loadCertificates();
    await loadDuels();
    if (user?.id) {
      const { data } = await supabase.from('users_points').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setUserPoints(data);
    }
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

          <div id="parent-reminder-settings" className="rounded-lg border border-gray-200 p-4 bg-teal-50/40">
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
                  <p className="text-xs text-cyan-800 font-semibold">Parent progress portal</p>
                  <p className="text-xs text-cyan-700 mt-1">
                    Check your child’s daily activity, quiz attempts, games, pledge logs and points. This is the best way to see whether they are staying active enough to keep prize chances alive.
                  </p>
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

          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">🏅 My Certificates</h2>
                <p className="text-xs text-gray-600">
                  Earned so far: <span className="font-bold text-amber-700">{certificateCount}</span>
                  {' · '}
                  <span className="text-slate-700">Weekly {weeklyCount}</span>
                  {' · '}
                  <span className="text-indigo-700">Monthly {monthlyCount}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 p-1 text-xs font-bold text-slate-700 shadow-sm">
                  {[
                    { k: 'all', label: 'All' },
                    { k: 'weekly', label: 'Weekly' },
                    { k: 'monthly', label: 'Monthly' },
                    { k: 'monthly_points', label: 'Top pts' },
                    { k: 'always_active', label: 'Always active' },
                  ].map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      onClick={() => setCertificatesFilter(t.k as any)}
                      className={`rounded-full px-2.5 py-1 ${
                        certificatesFilter === t.k
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void loadCertificates(); }}
                  disabled={certificatesLoading}
                >
                  {certificatesLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
            </div>

            {certificatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl bg-amber-100/60 border border-amber-200/70" />
                ))}
              </div>
            ) : (() => {
              const weeklyRows = certificates.map((cert: any) => ({
                kind: 'weekly' as const,
                id: cert.id,
                date: cert.weekStart,
                rank: cert.rank,
                tier: cert.tier,
                category: 'weekly_participation' as const,
                points: cert.weeklyPoints,
                activity: cert.weeklyActivityCount,
                activeWeeks: 1,
                consecutiveMonths: 0,
                badgesAtAward: cert.badgesAtAward,
                pointsAwarded: 0,
                issuedAt: cert.issuedAt,
                issuedBy: null,
                weeklyScore: cert.weeklyScore,
              }));
              const monthlyRows = certificatesMonthly.map((cert: any) => ({
                kind: 'monthly' as const,
                id: cert.id,
                date: cert.date,
                rank: cert.rank,
                tier: cert.tier,
                category: cert.category as 'monthly_points' | 'always_active',
                points: cert.points,
                activity: cert.activity,
                activeWeeks: cert.activeWeeks,
                consecutiveMonths: cert.consecutiveMonths,
                badgesAtAward: cert.badgesAtAward,
                pointsAwarded: cert.pointsAwarded,
                issuedAt: cert.issuedAt,
                issuedBy: cert.issuedBy,
              }));
              const f = certificatesFilter;
              const combined = [...monthlyRows, ...weeklyRows].sort((a, b) => (a.date < b.date ? 1 : -1));
              let rows = combined;
              if (f === 'weekly') rows = weeklyRows.sort((a, b) => (a.date < b.date ? 1 : -1));
              else if (f === 'monthly') rows = monthlyRows.sort((a, b) => (a.date < b.date ? 1 : -1));
              else if (f === 'monthly_points') rows = monthlyRows.filter((r) => r.category === 'monthly_points').sort((a, b) => (a.date < b.date ? 1 : -1));
              else if (f === 'always_active') rows = monthlyRows.filter((r) => r.category === 'always_active').sort((a, b) => (a.date < b.date ? 1 : -1));
              if (rows.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-5 text-center text-sm text-gray-600">
                    <p className="font-semibold text-amber-800">
                      {f === 'always_active'
                        ? 'No Always Active certificates yet.'
                        : f === 'monthly_points'
                          ? 'No Monthly Points leaderboard certificates yet.'
                          : f === 'monthly'
                            ? 'No monthly certificates yet.'
                            : f === 'weekly'
                              ? 'No weekly certificates yet.'
                              : 'No certificates yet.'}
                    </p>
                    <p className="mt-1 text-xs">Keep taking part — consistency gets noticed!</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {rows.map((row: any) => (
                    <CertificateCard
                      key={row.kind + '-' + row.id}
                      kind={row.kind}
                      category={row.category}
                      date={row.date}
                      userName={row.kind === 'weekly' ? profile?.name || 'Young Scholar' : row.userName || profile?.name || 'Young Scholar'}
                      tier={row.tier}
                      rank={row.rank}
                      points={row.points}
                      activity={row.activity}
                      activeWeeks={row.activeWeeks}
                      consecutiveMonths={row.consecutiveMonths}
                      badgesAtAward={row.badgesAtAward}
                      pointsAwarded={row.pointsAwarded}
                      issuedAt={row.issuedAt}
                      issuedBy={row.issuedBy}
                      weeklyScore={row.weeklyScore}
                    />
                  ))}
                </div>
              );
            })()}
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">⚔️ Quran Duels</h2>
                <p className="text-xs text-gray-600">
                  <span className="font-bold text-sky-700">
                    {myDuelsStats.played} played
                  </span>
                  {' · '}
                  <span className="text-emerald-700 font-bold">{myDuelsStats.won} W</span>
                  {' · '}
                  <span className="text-amber-700 font-bold">{myDuelsStats.tied} T</span>
                  {' · '}
                  <span className="text-rose-700 font-bold">{myDuelsStats.lost} L</span>
                  {' · '}
                  <span className="text-slate-700 font-bold">
                    +{myDuelsStats.points} duel pts
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/quran-duel"
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:brightness-105"
                >
                  <Swords className="h-3.5 w-3.5" /> New duel
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { void loadDuels(); }}
                  disabled={myDuelsLoading}
                >
                  {myDuelsLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
            </div>

            {myDuelsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-sky-100/70 border border-sky-200/70" />
                ))}
              </div>
            ) : myDuels.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-sky-200 bg-white/70 p-6 text-center text-sm text-slate-600">
                No duels yet! Challenge a sibling or friend with a 6-letter share code.
                <div className="mt-3">
                  <Link
                    href="/quran-duel"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
                  >
                    <Trophy className="h-3.5 w-3.5" /> Start my first duel
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myDuels.slice(0, 12).map((d: any) => {
                  const asCreator = d.viewerRole === 'creator';
                  const myName = asCreator ? d.creator?.name : d.opponent?.name;
                  const oppName = asCreator ? d.opponent?.name : d.creator?.name;
                  const myScore = asCreator ? d.creator?.correct : d.opponent?.correct;
                  const oppScore = asCreator ? d.opponent?.correct : d.creator?.correct;
                  const finished = d.status === 'finished';
                  const didIWin = finished && d.winnerId === user?.id;
                  const isTie = finished && !!d.isTie;
                  return (
                    <Link
                      key={String(d.id)}
                      href={`/quran-duel?id=${String(d.id)}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-widest text-slate-800">
                          {String(d.duelCode)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            finished
                              ? didIWin
                                ? 'bg-emerald-100 text-emerald-700'
                                : isTie
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {finished
                            ? didIWin
                              ? 'WIN'
                              : isTie
                                ? 'TIE'
                                : 'LOSS'
                            : d.status === 'expired'
                              ? 'EXPIRED'
                              : d.status === 'waiting'
                                ? 'WAITING'
                                : 'PLAYING'}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold truncate max-w-[10rem]">{myName || 'You'}</span>
                        <span className="font-mono font-black text-slate-700">
                          {myScore ?? '-'} : {oppScore ?? '-'}
                        </span>
                        <span className="font-bold truncate max-w-[10rem] text-right">
                          {oppName || 'Challenger'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuelDate(d.createdAt)}
                        </span>
                        {finished && didIWin ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                            <Trophy className="h-3 w-3" /> Winner
                          </span>
                        ) : finished && isTie ? (
                          <CheckCircle2 className="h-3 w-3 text-amber-600" />
                        ) : finished ? (
                          <XCircle className="h-3 w-3 text-rose-500" />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sky-700 font-bold">
                            <Clock className="h-3 w-3" /> {countdownDuel(d.expiresAt)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

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
