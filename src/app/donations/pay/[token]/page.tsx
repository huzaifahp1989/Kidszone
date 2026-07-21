'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components';
import { formatDonationAmount } from '@/lib/donations';
import { CreditCard, Heart, ShieldCheck } from 'lucide-react';

type ParentPayRequest = {
  token: string;
  childName: string;
  amountPence: number;
  description: string;
  status: string;
  isExpired: boolean;
  isPaid: boolean;
};

export default function ParentDonationPayPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params?.token || '').trim().toUpperCase();

  const [request, setRequest] = useState<ParentPayRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/donations/pay/${token}`, { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not load payment link');
      setRequest(payload.request);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load payment link');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      setMessage('JazakAllah khayr! The sadaqah payment was successful.');
      loadRequest();
    } else if (payment === 'cancelled') {
      setError('Payment was cancelled. You can try again when ready.');
    }

    router.replace(`/donations/pay/${token}`, { scroll: false });
  }, [loadRequest, router, token]);

  const handlePay = async () => {
    setPaying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/donations/pay/${token}/checkout`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not start payment');
      if (!payload.url) throw new Error('Stripe checkout URL was missing.');
      window.location.href = payload.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start payment');
      setPaying(false);
    }
  };

  return (
    <div className="page-inner pb-24">
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
            <Heart size={14} />
            Parent / Guardian payment
          </div>
          <h1 className="mt-3 text-3xl font-black text-emerald-950">Help with sadaqah</h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
            Your child asked you to help them give sadaqah on Kids Zone. Payments go securely through Stripe.
          </p>
        </section>

        {loading && (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Loading payment details…
          </p>
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

        {!loading && request && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Requested by</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{request.childName}</p>

            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Amount</p>
              <p className="text-3xl font-black text-emerald-900">
                {formatDonationAmount(request.amountPence)}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Message from child</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{request.description}</p>
            </div>

            {request.isPaid ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
                This sadaqah has already been paid. JazakAllah khayr!
              </div>
            ) : request.isExpired ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                This link has expired. Ask your child to create a new payment link from the Kids Zone app.
              </div>
            ) : (
              <>
                <p className="mt-5 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                  You will be taken to Stripe&apos;s secure checkout page. No Kids Zone account is needed.
                </p>
                <Button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="mt-4 w-full"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <CreditCard size={16} />
                    {paying ? 'Opening secure checkout…' : `Pay ${formatDonationAmount(request.amountPence)} with card`}
                  </span>
                </Button>
              </>
            )}
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          <Link href="/donations" className="font-semibold text-emerald-700 hover:underline">
            Back to Kids Sadaqah
          </Link>
        </p>
      </main>
    </div>
  );
}
