'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

type ReviewSubmission = {
  id: string;
  result: 'pending_review' | 'pass' | 'failed';
  marksTotal: number;
  maxMarks: number;
  adminNotes: string;
  reviewedAt: string | null;
  submittedAt: string;
};

type HadithQuizRetryPopupProps = {
  userId: string;
};

const storageKey = (userId: string, submissionId: string) =>
  `kidszone-hadith-retry-popup:${userId}:${submissionId}`;

export function HadithQuizRetryPopup({ userId }: HadithQuizRetryPopupProps) {
  const [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!userId || typeof window === 'undefined') return;
      try {
        const headers = await getAuthFetchHeaders();
        const res = await fetch('/api/hadith-october-quiz/my-result', { headers, cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        const latest = (data.submission || null) as ReviewSubmission | null;
        setQuizOpen(Boolean(data.quizOpen));
        if (!latest || latest.result !== 'failed') return;

        setSubmission(latest);
        if (!window.localStorage.getItem(storageKey(userId, latest.id))) {
          setOpen(true);
        }
      } catch {
        /* nothing to show */
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const close = () => {
    if (userId && submission) {
      window.localStorage.setItem(storageKey(userId, submission.id), 'seen');
    }
    setOpen(false);
  };

  if (!userId || !submission) return null;

  return (
    <Modal isOpen={open} onClose={close} title="Your Hadith Quiz result" size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="mb-2 text-4xl">📝</p>
          <p className="text-lg font-bold text-rose-900">You did not pass this time</p>
          <p className="mt-2 text-sm text-rose-800">
            You scored {submission.marksTotal} out of {submission.maxMarks}. Do not worry — you can try again.
          </p>
        </div>

        {submission.adminNotes ? (
          <div className="rounded-xl border border-sand-200 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sand-500">Note from the admin</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{submission.adminNotes}</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {quizOpen ? (
            <Link
              href="/hadith/quiz/october-2026"
              onClick={close}
              className="block rounded-xl bg-teal-700 px-4 py-3 text-center font-extrabold text-white hover:bg-teal-800"
            >
              Try the quiz again
            </Link>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-center text-sm font-semibold text-amber-900">
              The quiz has closed, so a new attempt is not available right now.
            </p>
          )}
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-sand-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
