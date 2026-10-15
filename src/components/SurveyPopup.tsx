'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { Modal, Button } from '@/components';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

/** Public fill URL (not the /edit owner link). */
const SURVEY_URL =
  'https://docs.google.com/forms/d/1BUqre1m5LhF9ImlIgJ-C3s_r-2xV66M1y1WUWXmIfoY/viewform';

/** Bump to re-show after campaign/copy changes. */
const CAMPAIGN_VERSION = 'user-feedback-v2';
const STORAGE_KEY = `kids-zone-survey-popup:${CAMPAIGN_VERSION}`;
const SESSION_ID = `kids-zone-survey:${CAMPAIGN_VERSION}`;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Kids Zone feedback survey popup — asks users to spend ~1 minute on the Google Form.
 */
export function SurveyPopup() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  const isExcluded = useMemo(() => {
    if (!pathname) return true;
    if (pathname.startsWith('/admin')) return true;
    if (pathname.startsWith('/signin') || pathname.startsWith('/signup')) return true;
    if (pathname.startsWith('/reset-password')) return true;
    if (pathname.startsWith('/onboarding-form')) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    if (isExcluded) {
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
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isExcluded, pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (isExcluded) return null;

  return (
    <Modal isOpen={open} onClose={dismiss} title="Kids Zone Survey" size="md">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-700 via-teal-600 to-sky-600 p-5 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <ClipboardList size={14} /> Quick feedback
          </p>
          <h3 className="mt-3 font-heading text-2xl font-extrabold leading-tight">
            Please take 1 minute to fill in our survey
          </h3>
          <p className="mt-2 text-sm text-white/90">
            It is very important for us — your answers help us improve Kids Zone for every family.
          </p>
        </div>

        <p className="text-sm text-sand-800">
          Assalamu Alaikum. A short form about how you use the app, what helps you, and how we can
          reach you with updates.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={dismiss}>
            Maybe later
          </Button>
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
          >
            Fill survey (1 min) →
          </a>
        </div>
      </div>
    </Modal>
  );
}
