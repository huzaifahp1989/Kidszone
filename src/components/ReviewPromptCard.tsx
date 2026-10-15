'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Star } from 'lucide-react';
import { requestInAppReviewWithFallback } from '@/lib/in-app-review';
import type { StorePlatform } from '@/lib/app-store-links';

type ReviewPromptCardProps = {
  compact?: boolean;
};

export function ReviewPromptCard({ compact = false }: ReviewPromptCardProps) {
  const [prompting, setPrompting] = useState<StorePlatform | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestReview = async (platform: StorePlatform) => {
    setPrompting(platform);
    setMessage(null);
    const result = await requestInAppReviewWithFallback(platform);

    if (result.status === 'requested') {
      setMessage('Review prompt requested. Thank you for supporting Kids Zone!');
    } else if (result.status === 'fallback_opened') {
      setMessage('Store page opened. Please leave a rating if you have a moment.');
    } else if (result.status === 'cooldown') {
      setMessage('You have already been asked recently. Thank you!');
    } else if (result.status === 'unavailable') {
      setMessage('In-app review is unavailable on this device.');
    } else {
      setMessage(result.message || 'Could not open review right now.');
    }
    setPrompting(null);
  };

  return (
    <section className={`feature-tile border-gold-200 bg-gradient-to-br from-gold-50 via-white to-coral-50 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
            <Star size={20} fill="currentColor" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-gold-700">Enjoying Kids Zone?</p>
            <h2 className="mt-1 text-lg font-black text-sand-900">Share your support with a review</h2>
            {!compact && <p className="mt-1 text-sm text-sand-600">A quick rating helps other families find the app.</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void requestReview('android')}
            disabled={prompting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600 disabled:cursor-wait disabled:opacity-60"
          >
            <ExternalLink size={15} />
            {prompting === 'android' ? 'Opening...' : 'Google Play'}
          </button>
          <button
            type="button"
            onClick={() => void requestReview('ios')}
            disabled={prompting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3.5 py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
          >
            <ExternalLink size={15} />
            {prompting === 'ios' ? 'Opening...' : 'App Store'}
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800" role="status">
          <CheckCircle2 size={15} />
          {message}
        </p>
      )}
    </section>
  );
}