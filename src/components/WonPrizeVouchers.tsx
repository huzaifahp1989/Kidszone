'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Link from 'next/link';
import { Copy, Gift, QrCode, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { VoucherRedemption } from '@/types/vouchers';

export function WonPrizeVouchers() {
  const [prizes, setPrizes] = React.useState<VoucherRedemption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadPrizes = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setPrizes([]);
        return;
      }

      const res = await fetch('/api/rewards/winner-status', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load prizes');

      const spinPrizes = Array.isArray(json.spinPrizes) ? json.spinPrizes : [];
      const activePrizes = Array.isArray(json.activePrizes) ? json.activePrizes : [];
      const merged = spinPrizes.length > 0 ? spinPrizes : activePrizes;
      setPrizes(merged);
    } catch {
      setPrizes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPrizes();
  }, [loadPrizes]);

  React.useEffect(() => {
    const onSpinComplete = () => {
      loadPrizes();
    };
    window.addEventListener('kidszone-spin-complete', onSpinComplete);
    return () => window.removeEventListener('kidszone-spin-complete', onSpinComplete);
  }, [loadPrizes]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Copied ${code}`);
    } catch {
      setMessage('Could not copy code.');
    }
  };

  if (loading || prizes.length === 0) return null;

  return (
    <section className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
          <Gift size={14} />
          Your won prizes
        </div>
        <Link href="/my-vouchers" className="text-sm font-bold text-violet-700 underline">
          Open My Vouchers
        </Link>
      </div>

      {message ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4">
        {prizes.map((prize) => (
          <article
            key={prize.id}
            className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 shadow-md"
          >
            <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex gap-4">
                {(prize.imageUrl || prize.logoUrl) && (
                  <img
                    src={prize.imageUrl || prize.logoUrl || ''}
                    alt={prize.voucherTitle}
                    className="h-24 w-24 shrink-0 rounded-xl border border-white object-cover shadow-sm"
                  />
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Ready to use</p>
                  <h3 className="mt-1 text-xl font-black text-slate-900">{prize.voucherTitle}</h3>
                  <p className="text-sm text-slate-600">{prize.businessName}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Your code</p>
                  <p className="text-2xl font-black tracking-[0.12em] text-slate-900">{prize.voucherCode}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Expires {new Date(prize.expiresAt).toLocaleString()}
                    {prize.status === 'pending_approval' ? ' · Pending approval' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                {prize.qrValue ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(prize.qrValue || prize.voucherCode)}`}
                    alt={`QR for ${prize.voucherCode}`}
                    className="h-[140px] w-[140px] rounded-xl border border-slate-200 bg-white p-2"
                  />
                ) : (
                  <div className="flex h-[140px] w-[140px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                    <QrCode size={32} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => copyCode(prize.voucherCode)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                >
                  <Copy size={14} />
                  Copy code
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-slate-500">
        <Ticket size={12} className="mr-1 inline" />
        Show this code or QR at the shop. Vouchers are active for 24 hours after you spin.
      </p>
    </section>
  );
}
