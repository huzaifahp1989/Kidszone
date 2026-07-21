'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { Modal, Button } from '@/components';

const STORAGE_KEY = 'rewards_poster_popup_last_seen';

export function RewardsPosterPopup() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(STORAGE_KEY) === today) return;
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(STORAGE_KEY, today);
    }
    setIsOpen(false);
  }, []);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Weekly Winners" size="lg">
      <div className="space-y-4">
        {imgError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Poster image not found yet. Please upload it to:
            <div className="mt-2 font-mono text-xs break-all">
              public/posters/weekly-winners-2026-05-08.png
            </div>
          </div>
        ) : (
          <img
            src="/posters/weekly-winners-2026-05-08.png"
            alt="Weekly winners poster"
            className="w-full rounded-2xl border border-[#c4b5fd]/30 shadow-lg"
            onError={() => setImgError(true)}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="primary" className="w-full" onClick={close}>
            Close
          </Button>
          <a
            className="w-full"
            href="/posters/weekly-winners-2026-05-08.png"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full">
              Open Full Image
            </Button>
          </a>
        </div>
      </div>
    </Modal>
  );
}

