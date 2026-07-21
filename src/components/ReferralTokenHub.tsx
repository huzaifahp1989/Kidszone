'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Gift, Share2, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { APP_STORE_LINKS } from '@/lib/app-store-links';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';
import { trackReferralShared } from '@/lib/analytics';

type ReferralPayload = {
  referralCode: string;
  inviteLink: string;
  tokensEarned: number;
  pointsEarned: number;
  successfulJoins: number;
  sharesCount: number;
  shareReward: {
    tokens: number;
    points: number;
    availableToday: boolean;
  };
  joinReward: {
    tokens: number;
    points: number;
  };
};

export default function ReferralTokenHub() {
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const [payload, setPayload] = useState<ReferralPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchPayload = async (userId: string, active = true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/kids-zone/referrals?userId=${userId}`, {
        cache: 'no-store',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load referral details');
      }
      if (active) {
        setPayload(data);
      }
    } catch (error: any) {
      if (active) {
        setPayload(null);
        setLoadError(error?.message || 'Could not load referral details right now.');
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setPayload(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let active = true;
    fetchPayload(user.id, active);

    return () => {
      active = false;
    };
  }, [user?.id]);

  const shareText = useMemo(() => {
    if (!payload) return '';
    return [
      `Join Kids Zone Islamic Learning and start earning rewards: ${payload.inviteLink}`,
      `Download on iPhone: ${APP_STORE_LINKS.ios}`,
      `Download on Android: ${APP_STORE_LINKS.android}`,
    ].join('\n');
  }, [payload]);

  const claimShareReward = async () => {
    if (!user?.id || !payload || claiming) {
      return;
    }

    setClaiming(true);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/kids-zone/referrals/share', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not claim share reward');
      }

      setMessage(data?.message || 'Share reward claimed.');
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          tokensEarned: current.tokensEarned + Number(data?.tokensAwarded || 0),
          pointsEarned: current.pointsEarned + Number(data?.pointsAwarded || 0),
          sharesCount: current.sharesCount + (data?.alreadyClaimedToday ? 0 : 1),
          shareReward: {
            ...current.shareReward,
            availableToday: data?.alreadyClaimedToday ? current.shareReward.availableToday : false,
          },
        };
      });

      if (data?.totals) {
        updateLocalProfile({
          points: data.totals.totalPoints,
          weeklyPoints: data.totals.weeklyPoints,
          monthlyPoints: data.totals.monthlyPoints,
          todayPoints: data.totals.todayPoints,
          badges: data.totals.badges,
          level: data.totals.level ? `Level ${data.totals.level}` : undefined,
        });
      }
      await refreshProfile();
    } catch (error: any) {
      setMessage(error?.message || 'Could not claim share reward right now.');
    } finally {
      setClaiming(false);
    }
  };

  const copyInviteLink = async () => {
    if (!payload?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(payload.inviteLink);
      trackReferralShared({ method: 'copy_link' });
      setMessage('Invite link copied. Share it with friends and then claim your daily share reward.');
    } catch {
      setMessage('Could not copy automatically. Please copy the link manually.');
    }
  };

  const nativeShare = async () => {
    if (!payload?.inviteLink) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Kids Zone Islamic Learning',
          text: 'Join me on Kids Zone and learn Islam through quizzes and games.',
          url: payload.inviteLink,
        });
        trackReferralShared({ method: 'native_share' });
        setMessage('Thanks for sharing. Now tap the claim button to collect your daily share reward.');
        return;
      } catch {
        // User may dismiss share drawer.
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    trackReferralShared({ method: 'whatsapp' });
    setMessage('Opened sharing. Once shared, claim your daily share reward.');
  };

  if (!user) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef2ff] rounded-full border border-[#6366f1]/20 text-sm font-semibold text-[#4338ca]">
          <Users size={16} />
          Referral Tokens
        </div>
        <h3 className="text-2xl font-bold text-[#1e1b4b]">Invite Friends, Earn Tokens</h3>
        <p className="text-[#475569] text-sm">
          Sign in to get your personal invite link, share Kids Zone with friends, and collect referral tokens when they join.
        </p>
        <a
          href="/signin?next=%2F"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-semibold hover:shadow-md"
        >
          <Share2 size={16} />
          Sign In to Activate Referral Tokens
        </a>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-52 rounded bg-[#f3e7d8]" />
          <div className="h-28 rounded-2xl bg-[#ede9fe]" />
        </div>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef2ff] rounded-full border border-[#6366f1]/20 text-sm font-semibold text-[#4338ca]">
          <Users size={16} />
          Referral Tokens
        </div>
        <h3 className="text-xl font-bold text-[#1e1b4b]">Referral Tokens Temporarily Unavailable</h3>
        <p className="text-[#475569] text-sm">
          {loadError || 'Could not load referral data right now. Please try again.'}
        </p>
        <button
          type="button"
          onClick={() => user?.id && fetchPayload(user.id, true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#cbd5e1] text-[#334155] font-semibold hover:bg-[#f1f5f9]"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef2ff] rounded-full border border-[#6366f1]/20 text-sm font-semibold text-[#4338ca]">
            <Users size={16} />
            Referral Tokens
          </div>
          <h3 className="mt-3 text-2xl font-bold text-[#1e1b4b]">Invite Friends, Earn Tokens</h3>
          <p className="text-[#475569] text-sm mt-1 max-w-2xl">
            Share your Kids Zone invite link. You earn tokens for sharing and even more tokens when friends join through your link.
          </p>
        </div>

        <div className="rounded-2xl bg-[#f8fafc] border border-[#cbd5e1] px-4 py-3 min-w-[220px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#475569]">Your Referral Code</p>
          <p className="text-2xl font-black text-[#1e293b] mt-1 tracking-wider">{payload.referralCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#fffbeb] border border-[#f59e0b]/20 p-4">
          <p className="text-xs uppercase text-[#a16207] tracking-[0.12em]">Tokens</p>
          <p className="text-2xl font-bold text-[#854d0e]">{payload.tokensEarned}</p>
        </div>
        <div className="rounded-2xl bg-[#ecfeff] border border-[#06b6d4]/20 p-4">
          <p className="text-xs uppercase text-[#0e7490] tracking-[0.12em]">Referral Points</p>
          <p className="text-2xl font-bold text-[#155e75]">{payload.pointsEarned}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f3ff] border border-[#8b5cf6]/20 p-4">
          <p className="text-xs uppercase text-[#6d28d9] tracking-[0.12em]">Joins</p>
          <p className="text-2xl font-bold text-[#5b21b6]">{payload.successfulJoins}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f3ff] border border-[#7c3aed]/20 p-4">
          <p className="text-xs uppercase text-[#5b21b6] tracking-[0.12em]">Shares</p>
          <p className="text-2xl font-bold text-[#5b21b6]">{payload.sharesCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
        <p className="text-sm font-semibold text-[#334155] mb-2">Your invite link</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={payload.inviteLink}
            className="w-full rounded-xl border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] bg-white"
          />
          <button
            type="button"
            onClick={copyInviteLink}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#cbd5e1] text-[#334155] font-semibold hover:bg-[#f1f5f9]"
          >
            <Copy size={16} />
            Copy
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-semibold hover:shadow-md"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] to-[#f0f9ff] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#1d4ed8]">Download Kids Zone App</p>
            <p className="text-xs text-[#1e3a8a] mt-1">
              Share these official store links so families can install the app quickly on iPhone and Android.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={APP_STORE_LINKS.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:opacity-90"
            >
              Download on App Store
            </a>
            <a
              href={APP_STORE_LINKS.android}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:opacity-90"
            >
              Get it on Google Play
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#fbbf24]/30 bg-gradient-to-r from-[#fffbeb] to-[#fff7ed] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[#b45309] font-bold">
              <Gift size={18} />
              Daily Share Reward
            </div>
            <p className="text-sm text-[#92400e]">
              Share app details and claim <strong>+{payload.shareReward.tokens} tokens</strong>{' '}
              {payload.shareReward.points > 0 ? `and +${payload.shareReward.points} points` : ''} once per day.
            </p>
            <p className="text-xs text-[#78350f]">
              Each successful join gives you <strong>+{payload.joinReward.tokens} tokens</strong>{' '}
              {payload.joinReward.points > 0 ? `and +${payload.joinReward.points} points` : ''}.
            </p>
            {message ? <p className="text-xs text-[#1e1b4b] pt-1">{message}</p> : null}
          </div>

          <button
            type="button"
            onClick={claimShareReward}
            disabled={!payload.shareReward.availableToday || claiming}
            className={`px-5 py-3 rounded-xl font-bold transition-all ${
              payload.shareReward.availableToday && !claiming
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-white text-[#475569] border border-[#c4b5fd]/40 cursor-not-allowed'
            }`}
          >
            {claiming
              ? 'Claiming...'
              : payload.shareReward.availableToday
                ? `Claim +${payload.shareReward.tokens} Tokens`
                : 'Reward Claimed Today'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#f0f9ff] border border-[#7dd3fc]/30 p-4 text-[#0c4a6e] text-sm">
        <div className="inline-flex items-center gap-2 font-bold">
          <Trophy size={16} />
          How it works
        </div>
        <p className="mt-2">
          1) Share your invite link. 2) Friends sign up through your link. 3) Tokens and referral points are added automatically through Supabase.
        </p>
      </div>
    </section>
  );
}
