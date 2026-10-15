'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, BookOpenText, Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';

const STORAGE_KEY = 'story-writing-feature-popup-seen';
const BLOCKED_PATH_PREFIXES = ['/admin', '/signin', '/signup', '/reset-password', '/onboarding-form', '/story-writer'];

function wasShownThisSession() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markShownThisSession() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // The popup can still be dismissed if browser storage is unavailable.
  }
}

export function StoryWritingPopup() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = React.useState(false);
  const blocked = BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  React.useEffect(() => {
    if (blocked || wasShownThisSession()) return;
    const timer = window.setTimeout(() => {
      markShownThisSession();
      setOpen(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [blocked, pathname]);

  const dismiss = () => {
    markShownThisSession();
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={dismiss} title="Islamic Story Writer" size="sm">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 text-4xl shadow-inner">
          ✍️
        </div>
        <div>
          <p className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">
            <Sparkles size={12} aria-hidden="true" />
            New feature
          </p>
          <h3 className="mt-2 text-xl font-black text-emerald-950">Write a story. Share a lesson.</h3>
          <p className="mt-2 text-sm leading-relaxed text-sand-700">
            Create an Islamic story, save a draft, and submit it for review. Approved stories can earn points in your Kids Zone account.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/story-writer"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-emerald-800 hover:to-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <BookOpenText size={17} aria-hidden="true" />
            Explore Story Writer
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-bold text-sand-700 transition hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
