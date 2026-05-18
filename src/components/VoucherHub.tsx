'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
  BellRing,
  Clock3,
  Copy,
  Gift,
  Image as ImageIcon,
  Loader2,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { buildEligibilityMessage, getExpiryCountdown } from '@/lib/vouchers';
import type { VoucherDashboardResponse, VoucherOffer, VoucherRedemption } from '@/types/vouchers';

type VoucherHubProps = {
  initialView?: 'offers' | 'history' | 'gallery';
};

type DashboardState = VoucherDashboardResponse & { notifications: VoucherDashboardResponse['notifications'] };

const currencyAccent = 'from-[#0f766e] via-[#0d9488] to-[#115e59]';

const buildDeviceFingerprint = () => {
  if (typeof window === 'undefined') return 'server';
  return [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    window.screen?.width || 0,
    window.screen?.height || 0,
  ].join('|');
};

export function VoucherHub({ initialView = 'offers' }: VoucherHubProps) {
  const { user } = useAuth();
  const [view, setView] = useState<'offers' | 'history' | 'gallery'>(initialView);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedRedemption, setSelectedRedemption] = useState<VoucherRedemption | null>(null);
  const voucherPassRef = useRef<HTMLDivElement | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/vouchers/dashboard', {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load vouchers');
      setDashboard(payload);
    } catch (err: any) {
      setError(err?.message || 'Could not load vouchers right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, user?.id]);

  const history = useMemo(() => dashboard?.history || [], [dashboard?.history]);
  const offers = useMemo(() => dashboard?.offers || [], [dashboard?.offers]);
  const gallery = useMemo(() => dashboard?.gallery || [], [dashboard?.gallery]);
  const notifications = useMemo(() => dashboard?.notifications || [], [dashboard?.notifications]);
  const analytics = dashboard?.analytics;

  const historyByVoucherId = useMemo(() => {
    const map = new Map<string, VoucherRedemption>();
    for (const item of history) {
      if (!map.has(item.voucherId)) {
        map.set(item.voucherId, item);
      }
    }
    return map;
  }, [history]);

  const activeHistory = history.filter((item) => item.status === 'active' || item.status === 'pending_approval');
  const usedHistory = history.filter((item) => item.status === 'used');
  const expiredHistory = history.filter((item) => item.status === 'expired' || item.status === 'cancelled');

  const redeemVoucher = async (offer: VoucherOffer) => {
    setActionMessage(null);
    setRedeemingId(offer.id);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in to redeem vouchers.');

      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucherId: offer.id,
          deviceFingerprint: buildDeviceFingerprint(),
          shareUrl: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to redeem voucher');

      setSelectedRedemption(payload.redemption);
      setActionMessage(`Voucher activated for 24 hours: ${payload.redemption.voucherCode}`);
      await loadDashboard();
      setView('history');
    } catch (err: any) {
      setActionMessage(err?.message || 'Unable to redeem voucher.');
    } finally {
      setRedeemingId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setActionMessage(`Copied ${code}`);
    } catch {
      setActionMessage('Copy failed. Please copy the code manually.');
    }
  };

  const shareVoucher = async (redemption: VoucherRedemption) => {
    const shareText = `${redemption.voucherTitle}\nCode: ${redemption.voucherCode}\nExpires: ${new Date(redemption.expiresAt).toLocaleString()}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: redemption.voucherTitle,
          text: shareText,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setActionMessage('Voucher details copied for sharing.');
    } catch {
      setActionMessage('Share was cancelled.');
    }
  };

  const saveVoucherImage = async () => {
    if (!voucherPassRef.current || !selectedRedemption) return;
    try {
      const dataUrl = await toPng(voucherPassRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${selectedRedemption.voucherCode}.png`;
      link.href = dataUrl;
      link.click();
      setActionMessage('Voucher pass saved as an image.');
    } catch {
      setActionMessage('Could not save the voucher image.');
    }
  };

  const statCards = [
    { label: 'Active offers', value: offers.filter((item) => item.status === 'active').length, tone: 'bg-[#ecfeff] text-[#155e75]' },
    { label: 'Your live vouchers', value: activeHistory.length, tone: 'bg-[#ecfdf5] text-[#166534]' },
    { label: 'Used vouchers', value: usedHistory.length, tone: 'bg-[#fff7ed] text-[#9a3412]' },
    { label: 'Popular offers', value: analytics?.popularVouchers?.length || 0, tone: 'bg-[#fdf4ff] text-[#86198f]' },
  ];

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,118,110,0.12)] backdrop-blur">
        <div className="flex items-center gap-3 text-[#0f766e]">
          <Loader2 className="animate-spin" />
          <span className="font-bold">Loading voucher rewards...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#cbd5e1] bg-[radial-gradient(circle_at_top_left,_rgba(236,253,245,0.95),_rgba(255,255,255,0.95)_45%,_rgba(240,249,255,0.95))] p-6 shadow-[0_32px_100px_rgba(15,118,110,0.16)] dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(20,184,166,0.05))] md:block" />
        <div className="relative z-10 grid gap-6 md:grid-cols-[1.7fr_1fr] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-[#0f766e] shadow-sm">
              <Sparkles size={14} /> Islam Media Central Rewards
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">
              Professional vouchers and community rewards, ready to redeem securely in the app.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-slate-300">
              Browse live offers from restaurants and local businesses, unlock codes instantly, and keep every active, used, and expired voucher in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setView('offers')}
                className="rounded-2xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#115e59]"
              >
                Browse offers
              </button>
              <Link
                href="/my-vouchers"
                className="rounded-2xl border border-[#99f6e4] bg-white px-5 py-3 text-sm font-black text-[#0f766e] transition hover:bg-[#f0fdfa]"
              >
                Open My Vouchers
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map((item) => (
              <div key={item.label} className={`rounded-[1.4rem] p-4 shadow-sm ${item.tone}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">{item.label}</p>
                <p className="mt-3 text-3xl font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {actionMessage && <div className="rounded-2xl border border-[#99f6e4] bg-[#f0fdfa] px-4 py-3 text-sm font-semibold text-[#0f766e]">{actionMessage}</div>}

      {notifications.length > 0 && (
        <div className="rounded-[1.8rem] border border-[#e2e8f0] bg-white/90 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <BellRing size={18} className="text-[#0f766e]" />
            <h3 className="text-lg font-black">Reward updates</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {notifications.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.type.replace(/_/g, ' ')}</p>
                <p className="mt-2 font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'offers', label: 'Active Rewards', icon: Gift },
          { key: 'history', label: 'My Vouchers', icon: Ticket },
          { key: 'gallery', label: 'Voucher Gallery', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const selected = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as typeof view)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                selected ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {view === 'offers' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {offers.map((offer, index) => {
            const userVoucher = historyByVoucherId.get(offer.id);
            const badge = userVoucher
              ? userVoucher.status === 'used'
                ? 'Used'
                : userVoucher.status === 'expired' || userVoucher.status === 'cancelled'
                  ? 'Expired'
                  : userVoucher.status === 'pending_approval'
                    ? 'Pending approval'
                    : 'Active'
              : offer.status === 'expired'
                ? 'Expired'
                : offer.closeToExpiry
                  ? 'Ending soon'
                  : offer.featured
                    ? 'Featured'
                    : 'Available';

            return (
              <motion.article
                key={offer.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="overflow-hidden rounded-[1.8rem] border border-[#dbe4ea] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
              >
                <div className={`bg-gradient-to-r ${currencyAccent} px-5 py-4 text-white`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">Expires {new Date(offer.expiryDate).toLocaleDateString()}</p>
                      <h3 className="mt-2 text-2xl font-black">{offer.title}</h3>
                      <p className="mt-1 text-sm text-white/85">{offer.businessName}</p>
                    </div>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]">{badge}</span>
                  </div>
                </div>

                <img
                  src={offer.bannerUrl || offer.imageUrl || offer.logoUrl || '/next.svg'}
                  alt={`${offer.title} promotional image`}
                  className="h-56 w-full object-cover"
                />

                <div className="p-5">
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f766e]">{offer.discountLabel || offer.discountType.replace('_', ' ')}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{offer.description}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{offer.approvalMode === 'manual' ? 'Manual approval' : 'Instant redeem'}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">1 code, 1 use</span>
                    {offer.locationLabel && <span className="rounded-full bg-slate-100 px-3 py-1">{offer.locationLabel}</span>}
                    {offer.closeToExpiry && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">{getExpiryCountdown(offer.expiryDate)}</span>}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Terms & conditions</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{offer.termsAndConditions}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">
                      {userVoucher ? buildEligibilityMessage({ allowed: false, reason: `Latest status: ${userVoucher.status.replace(/_/g, ' ')}`, remainingUserRedemptions: 0, remainingPeriodRedemptions: 0, manualApprovalRequired: false }) : 'Redeem to generate a secure one-time code.'}
                    </div>
                    <button
                      onClick={() => redeemVoucher(offer)}
                      disabled={redeemingId === offer.id || offer.status !== 'active' || Boolean(userVoucher && userVoucher.status !== 'expired' && userVoucher.status !== 'cancelled')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {redeemingId === offer.id ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                      {userVoucher && userVoucher.status !== 'expired' && userVoucher.status !== 'cancelled' ? 'Already claimed' : 'Redeem'}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {offers.length === 0 && (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 lg:col-span-2">
              No public vouchers are live yet.
            </div>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">My Vouchers</h3>
                  <p className="text-sm text-slate-500">Track live, used, and expired voucher codes in one timeline.</p>
                </div>
                {!user && <p className="text-sm font-bold text-amber-700">Sign in to view personal voucher history.</p>}
              </div>
            </div>

            {[{ title: 'Active', items: activeHistory }, { title: 'Used', items: usedHistory }, { title: 'Expired', items: expiredHistory }].map((group) => (
              <div key={group.title} className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900">{group.title}</h4>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{group.items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {group.items.length === 0 ? (
                    <p className="text-sm text-slate-500">No {group.title.toLowerCase()} vouchers yet.</p>
                  ) : (
                    group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedRedemption(item)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-black text-slate-900">{item.voucherTitle}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.businessName}</p>
                            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.voucherCode}</p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{item.status.replace(/_/g, ' ')}</p>
                            <p className="mt-2">Expires {new Date(item.expiresAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div ref={voucherPassRef} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className={`bg-gradient-to-br ${currencyAccent} px-5 py-5 text-white`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Voucher pass</p>
                    <h3 className="mt-2 text-2xl font-black">{selectedRedemption?.voucherTitle || 'Select a voucher'}</h3>
                  </div>
                  <ShieldCheck size={28} />
                </div>
              </div>
              <div className="p-5">
                {selectedRedemption ? (
                  <>
                    <p className="text-sm text-slate-500">{selectedRedemption.businessName}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">One-time code</p>
                        <p className="mt-2 text-3xl font-black tracking-[0.18em] text-slate-900">{selectedRedemption.voucherCode}</p>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p>Redeemed: {new Date(selectedRedemption.redeemedAt).toLocaleString()}</p>
                          <p>Expires: {new Date(selectedRedemption.expiresAt).toLocaleString()}</p>
                          <p>Status: <span className="font-black text-slate-900">{selectedRedemption.status.replace(/_/g, ' ')}</span></p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(selectedRedemption.qrValue || selectedRedemption.voucherCode)}`}
                          alt={`QR code for ${selectedRedemption.voucherCode}`}
                          className="h-[170px] w-[170px]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    Select any voucher from your history to view its full redemption pass.
                  </div>
                )}
              </div>
            </div>

            {selectedRedemption && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => copyCode(selectedRedemption.voucherCode)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50">
                  <Copy size={16} /> Copy code
                </button>
                <button onClick={() => shareVoucher(selectedRedemption)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50">
                  <Share2 size={16} /> Share voucher
                </button>
                <button onClick={saveVoucherImage} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 sm:col-span-2">
                  <Ticket size={16} /> Save pass image
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'gallery' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-xl font-black text-slate-900">Voucher Gallery</h3>
              <p className="text-sm text-slate-500">Poster-style offers curated for quick browsing on mobile.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{gallery.length} posters</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {gallery.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
                <img src={item.imageUrl} alt={item.title} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.businessName}</p>
                  <h4 className="mt-2 text-lg font-black text-slate-900">{item.title}</h4>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>Expires {new Date(item.expiryDate).toLocaleDateString()}</span>
                    <button onClick={() => setView('offers')} className="font-black text-slate-900">Open offer</button>
                  </div>
                </div>
              </article>
            ))}
            {gallery.length === 0 && (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 sm:col-span-2 xl:col-span-3">
                No gallery posters are available yet.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900"><Clock3 size={18} className="text-[#0f766e]" /><h4 className="font-black">24-hour live window</h4></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Every redeemed voucher activates with a secure one-time code and expires automatically 24 hours later.</p>
        </div>
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900"><QrCode size={18} className="text-[#0f766e]" /><h4 className="font-black">QR-ready checkout</h4></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Each active code has a scan-friendly QR payload for quick verification at the counter or takeaway desk.</p>
        </div>
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900"><ShieldCheck size={18} className="text-[#0f766e]" /><h4 className="font-black">Anti-fraud checks</h4></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">The system tracks per-user limits, device fingerprints, automatic expiry, and admin approval states to reduce duplicate redemption attempts.</p>
        </div>
      </div>
    </section>
  );
}