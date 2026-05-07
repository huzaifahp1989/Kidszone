'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Modal, Button } from '@/components';

const STORAGE_KEY = 'newsletter_popup_2026_05';

function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function NewsletterPopup() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const isExcludedRoute = React.useMemo(() => {
    if (!pathname) return false;
    if (pathname.startsWith('/admin')) return true;
    if (pathname === '/signin' || pathname === '/signup' || pathname === '/reset-password') return true;
    return false;
  }, [pathname]);

  React.useEffect(() => {
    if (isExcludedRoute) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') return;

    const timeout = window.setTimeout(() => setIsOpen(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isExcludedRoute]);

  const close = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setStatus('loading');
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to subscribe. Please try again.');
      }

      setStatus('success');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      }
      window.setTimeout(() => setIsOpen(false), 1200);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Failed to subscribe. Please try again.');
    }
  };

  if (isExcludedRoute) return null;
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Get Updates & New Activities" size="md">
      <div className="space-y-4 text-slate-700 text-sm sm:text-base">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-center">
          <div className="text-3xl mb-2">📩</div>
          <p className="font-semibold">
            Join our newsletter for new quizzes, competitions, and learning updates.
          </p>
          <p className="mt-1 text-slate-600">
            You can unsubscribe anytime.
          </p>
        </div>

        {status === 'success' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="font-bold text-emerald-800">Subscribed successfully!</p>
            <div className="mt-3">
              <Button variant="outline" className="w-full" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Submitting...' : 'Subscribe'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={close}>
                No thanks
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

