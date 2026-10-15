'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Gift, ScrollText, Trophy } from 'lucide-react';
import { Modal, Button } from '@/components';
import { DEFAULT_WRITTEN_SLUG } from '@/lib/written-competition';
import {
  RABI_UL_AWWAL_CLOSING_DATE,
  RABI_UL_AWWAL_SEED_COMPETITION,
} from '@/lib/written-competition-seed';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

/** Bump to show the popup again after copy/campaign changes. */
const CAMPAIGN_VERSION = 'sept-2026-seerah-v1';
const STORAGE_KEY = `seerah-competition-popup:${CAMPAIGN_VERSION}`;
const SESSION_ID = `seerah-competition:${CAMPAIGN_VERSION}`;
const HREF = `/competitions/written/${DEFAULT_WRITTEN_SLUG}`;

const TARGET_MATCHERS: Array<(path: string) => boolean> = [
  (p) => p === '/',
  (p) => p === '/quiz' || p.startsWith('/quiz/'),
  (p) => p === '/quiz-challenge' || p.startsWith('/quiz-challenge/'),
  (p) => p === '/rewards' || p.startsWith('/rewards/'),
  (p) => p === '/competitions/written' || p === '/competitions',
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function closingLabel() {
  try {
    return new Date(RABI_UL_AWWAL_CLOSING_DATE).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return '30 September 2026';
  }
}

function isCompetitionStillOpen() {
  return Date.now() <= new Date(RABI_UL_AWWAL_CLOSING_DATE).getTime();
}

/**
 * Promotional popup for the Sept 2026 Seerah written quiz competition.
 * Shows once per browser session on key pages (and once per day if dismissed).
 */
export function SeerahCompetitionPopup() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  const isTargetPage = useMemo(
    () => TARGET_MATCHERS.some((match) => match(pathname)),
    [pathname]
  );

  const isExcluded = useMemo(() => {
    if (!pathname) return true;
    if (pathname.startsWith('/admin')) return true;
    if (pathname.startsWith('/signin') || pathname.startsWith('/signup')) return true;
    if (pathname.startsWith('/competitions/written/')) return true;
    if (pathname.startsWith('/competitions/rabi-ul-awwal')) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    if (isExcluded || !isTargetPage || !isCompetitionStillOpen()) {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === todayKey()) return;
        if (!canShowSessionPopup(SESSION_ID)) return;
        markSessionPopupShown(SESSION_ID);
        setOpen(true);
      } catch {
        setOpen(true);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [isExcluded, isTargetPage, pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (isExcluded || !isTargetPage) return null;

  return (
    <Modal isOpen={open} onClose={dismiss} title="Sept 2026 Seerah Competition" size="md">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-700 via-teal-600 to-sky-600 p-5 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <ScrollText size={14} /> Written quiz competition
          </p>
          <h3 className="mt-3 font-heading text-2xl font-extrabold leading-tight">
            {RABI_UL_AWWAL_SEED_COMPETITION.name}
          </h3>
          <p className="mt-2 text-sm text-white/90">
            September 2026 Seerah challenge — write your own answers about the life of Prophet Muhammad ﷺ
            and enter the prize draw.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-sand-800">
          <li className="flex items-start gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
            <Trophy size={16} className="mt-0.5 shrink-0 text-teal-700" />
            <span>
              <strong>10 written questions</strong> — no multiple choice. One submission per child.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
            <Gift size={16} className="mt-0.5 shrink-0 text-gold-600" />
            <span>
              Prizes include <strong>An-Nasihah World</strong> yearly access and a school stationery bundle.
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
            <Calendar size={16} className="mt-0.5 shrink-0 text-teal-700" />
            <span>
              Closes <strong>{closingLabel()}</strong> (UTC). Winners announced after admin review.
            </span>
          </li>
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={dismiss}>
            Maybe later
          </Button>
          <Link
            href={HREF}
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
          >
            Enter Seerah Quiz →
          </Link>
        </div>
      </div>
    </Modal>
  );
}
