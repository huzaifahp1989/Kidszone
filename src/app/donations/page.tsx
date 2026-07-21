'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import {
  DONATION_TYPES,
  formatDonationAmount,
  getDonationTypeEmoji,
  getDonationTypeLabel,
} from '@/lib/donations';
import { DONATION_PRESET_AMOUNTS_PENCE } from '@/lib/stripe-donation-constants';
import { supabase } from '@/lib/supabase';
import type { DonationEntry, DonationType } from '@/types/donation';
import { Gift, Heart, Trophy, CreditCard, Share2, Copy, Link2 } from 'lucide-react';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export default function DonationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<DonationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [linkCreating, setLinkCreating] = useState(false);
  const [parentPayUrl, setParentPayUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [moneyLogMode, setMoneyLogMode] = useState<'cash' | 'online'>('online');

  const [donationType, setDonationType] = useState<DonationType>('money');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const summary = useMemo(() => {
    const totalAmountPence = entries.reduce((sum, entry) => sum + entry.amountPence, 0);
    return { count: entries.length, totalAmountPence };
  }, [entries]);

  const loadEntries = useCallback(async () => {
    if (!user?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to log sadaqah.');

      const res = await fetch('/api/donations/entries?limit=20', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload?.setupRequired) {
        setSetupRequired(true);
        setEntries([]);
        return;
      }
      if (!res.ok) throw new Error(payload.error || 'Failed to load donations');

      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
      setSetupRequired(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load donations');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadEntries();
  }, [authLoading, loadEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      setMessage('MashaAllah! Your online sadaqah payment was successful. It may take a moment to appear below.');
      loadEntries();
    } else if (payment === 'cancelled') {
      setError('Online payment was cancelled. You can try again or log cash sadaqah instead.');
    }

    router.replace('/donations', { scroll: false });
  }, [loadEntries, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authLoading) return;

    if (!user?.id) {
      router.push('/signin?next=/donations');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to log sadaqah.');

      const res = await fetch('/api/donations/entries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donationType,
          amount: donationType === 'money' ? amount : undefined,
          description,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not save donation');

      setMessage(payload.message || 'MashaAllah! Your sadaqah has been logged.');
      setAmount('');
      setDescription('');
      await loadEntries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save donation');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateParentLink = async () => {
    if (authLoading) return;

    if (!user?.id) {
      router.push('/signin?next=/donations');
      return;
    }

    const trimmedDescription = description.trim();
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setError('Please pick or enter an amount first.');
      return;
    }
    if (trimmedDescription.length < 3) {
      setError('Please add a short message for your parent (at least 3 characters).');
      return;
    }

    setLinkCreating(true);
    setError(null);
    setMessage(null);
    setParentPayUrl(null);
    setShareMessage(null);
    setCopied(false);

    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to create a parent payment link.');

      const res = await fetch('/api/donations/payment-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not create parent payment link');

      setParentPayUrl(payload.parentPayUrl || null);
      setShareMessage(payload.shareMessage || null);
      setMessage(payload.message || 'Share this link with your parent or guardian.');
      document.getElementById('parent-pay-link')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create parent payment link');
    } finally {
      setLinkCreating(false);
    }
  };

  const handleCopyParentLink = async () => {
    if (!parentPayUrl) return;
    try {
      await navigator.clipboard.writeText(shareMessage || parentPayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link. Please copy it manually.');
    }
  };

  const handleShareParentLink = async () => {
    if (!parentPayUrl) return;
    const text = shareMessage || parentPayUrl;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kids Zone sadaqah',
          text,
          url: parentPayUrl,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    await handleCopyParentLink();
  };

  const handleStripeCheckout = async () => {
    if (authLoading) return;

    if (!user?.id) {
      router.push('/signin?next=/donations');
      return;
    }

    const trimmedDescription = description.trim();
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setError('Please pick or enter an amount first.');
      return;
    }
    if (trimmedDescription.length < 3) {
      setError('Please add a short message (at least 3 characters).');
      return;
    }

    setCheckoutLoading(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to pay online.');

      const res = await fetch('/api/donations/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not start online payment');

      if (!payload.url) throw new Error('Stripe checkout URL was missing.');
      window.location.href = payload.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start online payment');
      setCheckoutLoading(false);
    }
  };

  const selectedType = DONATION_TYPES.find((item) => item.key === donationType);

  return (
    <div className="page-inner pb-32">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
            <Heart size={14} />
            Kids Sadaqah
          </div>
          <h1 className="mt-3 text-3xl font-black text-emerald-950">Give sadaqah &amp; log kindness</h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
            Ask a parent to pay online through Stripe, or log other good deeds like sharing food and helping others.
            Climb the <strong>Sadaqah Leaderboard</strong> and inspire other Kids Zone learners.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/donations/leaderboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-800"
            >
              <Trophy size={16} />
              View Leaderboard
            </Link>
            {!user && (
              <Link
                href="/signin?next=/donations"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-800"
              >
                Sign in to log sadaqah
              </Link>
            )}
          </div>
        </section>

        {setupRequired && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Database setup required</p>
            <p className="mt-1">
              Run <code className="rounded bg-white px-1">SETUP_KIDS_DONATIONS.sql</code> in Supabase, then refresh.
            </p>
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Gift className="text-emerald-600" size={20} />
              <h2 className="text-xl font-black text-slate-900">Log a new good deed</h2>
            </div>

            {!user && !authLoading && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-bold">Sign in required</p>
                <p className="mt-1">
                  Fill in the form below, then sign in to create a parent payment link or save your sadaqah.
                </p>
                <Link
                  href="/signin?next=/donations"
                  className="mt-3 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                >
                  Sign in to continue
                </Link>
              </div>
            )}

            {authLoading && (
              <p className="mb-5 text-sm text-slate-500">Checking your sign-in…</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">What did you give or do?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DONATION_TYPES.map((item) => {
                    const selected = donationType === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setDonationType(item.key)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <p className="mt-1 font-bold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {donationType === 'money' && (
                <>
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-700">How are you giving money?</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMoneyLogMode('online');
                          setParentPayUrl(null);
                          setShareMessage(null);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          moneyLogMode === 'online'
                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <p className="font-bold text-slate-900">Ask parent to pay</p>
                        <p className="mt-1 text-xs text-slate-500">Create a link for mum, dad, or a guardian</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoneyLogMode('cash');
                          setParentPayUrl(null);
                          setShareMessage(null);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          moneyLogMode === 'cash'
                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <p className="font-bold text-slate-900">Cash / coins</p>
                        <p className="mt-1 text-xs text-slate-500">Log pocket money or coins you already gave</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-700">Choose an amount</p>
                    <div className="flex flex-wrap gap-2">
                      {DONATION_PRESET_AMOUNTS_PENCE.map((preset) => {
                        const selected = amount === String(preset / 100);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset / 100))}
                            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                              selected
                                ? 'border-emerald-500 bg-emerald-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                            }`}
                          >
                            {formatDonationAmount(preset)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">
                      {moneyLogMode === 'online' ? 'Amount (£) or pick above' : 'Amount (£)'}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="e.g. 2.00"
                      required
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      {moneyLogMode === 'online'
                        ? 'Minimum online payment is £0.50. Ask a parent or guardian before sharing a payment link.'
                        : 'Ask a parent or guardian before giving money.'}
                    </span>
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">Tell us what happened</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder={
                    selectedType
                      ? `Example: ${selectedType.hint}`
                      : 'Describe your charity or kindness act'
                  }
                  required
                  maxLength={500}
                />
              </label>

              <p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
                Be honest and kind. Only log real sadaqah and good deeds you did with a parent&apos;s permission when needed.
              </p>

              <div className="flex flex-wrap gap-3 pb-4">
                {donationType === 'money' && moneyLogMode === 'online' ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleCreateParentLink}
                      disabled={linkCreating || setupRequired || authLoading}
                      className="w-full sm:w-auto"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Link2 size={16} />
                        {linkCreating ? 'Creating parent link…' : 'Create link for parent'}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleStripeCheckout}
                      disabled={checkoutLoading || setupRequired || authLoading}
                      className="w-full sm:w-auto"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CreditCard size={16} />
                        {checkoutLoading ? 'Opening checkout…' : 'Pay now on this device'}
                      </span>
                    </Button>
                  </>
                ) : (
                  <Button type="submit" disabled={saving || setupRequired} className="w-full sm:w-auto">
                    {saving ? 'Saving…' : 'Log my sadaqah'}
                  </Button>
                )}
              </div>

              {donationType === 'money' && moneyLogMode === 'online' && parentPayUrl && (
                <div id="parent-pay-link" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">Give this to your parent or guardian</p>
                  <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                    {parentPayUrl}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={handleCopyParentLink}>
                      <span className="inline-flex items-center gap-2">
                        <Copy size={14} />
                        {copied ? 'Copied!' : 'Copy message'}
                      </span>
                    </Button>
                    <Button type="button" onClick={handleShareParentLink}>
                      <span className="inline-flex items-center gap-2">
                        <Share2 size={14} />
                        Share with parent
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </section>

        {user && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Your sadaqah journey</h2>
                <p className="text-sm text-slate-500">Recent good deeds you logged</p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Acts</p>
                  <p className="text-2xl font-black text-emerald-900">{summary.count}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Money given</p>
                  <p className="text-2xl font-black text-amber-900">
                    {formatDonationAmount(summary.totalAmountPence)}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-slate-500">Loading your donations…</p>
            ) : entries.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No sadaqah logged yet. Start with one small good deed today!
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">
                          {getDonationTypeEmoji(entry.donationType)}{' '}
                          {getDonationTypeLabel(entry.donationType)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{entry.description}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {entry.amountPence > 0 && (
                          <p className="text-base font-black text-emerald-700">
                            {formatDonationAmount(entry.amountPence)}
                          </p>
                        )}
                        {entry.stripeCheckoutSessionId && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                            Paid online
                          </p>
                        )}
                        <p>{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
