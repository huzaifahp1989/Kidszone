'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Modal, Button } from '@/components';

const STORAGE_KEY = 'newsletter_popup_last_seen';

function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function NewsletterPopup() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const isExcludedRoute = React.useMemo(() => {
    if (!pathname) return false;
    if (pathname.startsWith('/admin')) return true;
    if (pathname === '/signin' || pathname === '/signup' || pathname === '/reset-password') return true;
    return false;
  }, [pathname]);

  React.useEffect(() => {
    if (isExcludedRoute) return;
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(STORAGE_KEY) === today) return;

    const timeout = window.setTimeout(() => setIsOpen(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isExcludedRoute]);

  const close = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(STORAGE_KEY, today);
    }
    setIsOpen(false);
    setSubmitted(false);
    setEmail('');
    setError(null);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Failed to subscribe. Please try again.');
        return;
      }

      setSubmitted(true);
      setEmail('');
      setTimeout(() => close(), 2000);
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
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

        {submitted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <p className="font-semibold text-emerald-900">✓ Successfully subscribed!</p>
            <p className="text-sm text-emerald-800 mt-1">Check your email for confirmation.</p>
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
                disabled={loading}
                required
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
                disabled={loading}
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={close}
                disabled={loading}
              >
                No thanks
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
