'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Modal, Button } from '@/components';

export function WinnerPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(true);

  const handleClose = () => {
    setShowPopup(false);
  };

  if (pathname.startsWith('/admin')) return null;
  if (!showPopup) return null;

  return (
    <Modal
      isOpen={showPopup}
      onClose={handleClose}
      title="🏆 Competitions & Prizes"
      size="lg"
    >
      <div className="space-y-6 text-slate-700 text-sm sm:text-base">

        <div className="p-5 sm:p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center">
          <p className="font-semibold text-slate-700">
            If you have any issues signing up or logging in please use the WhatsApp number provided so we can send you a new password.
          </p>
        </div>

        <div className="p-5 sm:p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
          <p className="font-black text-lg sm:text-xl text-emerald-900">
            Sign your child now to start earning points
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => {
                handleClose();
                router.push('/signup');
              }}
            >
              Sign up
            </Button>
          </div>
        </div>

        <div className="p-5 sm:p-6 bg-sky-50 rounded-2xl border border-sky-200">
          <h3 className="font-black text-xl sm:text-2xl text-sky-900 mb-2 text-center">
            How to take part in the competition
          </h3>
          <div className="space-y-3 font-semibold text-slate-700">
            <div className="bg-white rounded-xl border border-sky-100 p-4">
              <p className="text-slate-800">
                Only these activities add up to points for prizes:
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.push('/quiz');
                  }}
                  className="text-left rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white hover:border-islamic-blue/60 transition p-4"
                >
                  <div className="text-lg font-black text-slate-900">🧠 Quiz</div>
                  <div className="text-sm text-slate-600 font-semibold mt-1">Play daily to earn more points</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.push('/pledge');
                  }}
                  className="text-left rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-white hover:border-islamic-blue/60 transition p-4"
                >
                  <div className="text-lg font-black text-slate-900">📿 Durood & Zikr Pledge</div>
                  <div className="text-sm text-slate-600 font-semibold mt-1">Complete pledges to gain points</div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-sky-100 p-4">
              <p>
                Please check the leaderboard to see your points and progress.
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    handleClose();
                    router.push('/leaderboard');
                  }}
                >
                  🏅 Open Leaderboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 bg-yellow-50 rounded-2xl border border-yellow-200 text-center">
          <div className="text-4xl mb-2">🎁</div>
          <p className="font-black text-lg text-yellow-900">To claim a prize</p>
          <p className="mt-2 font-semibold text-slate-700">
            Please WhatsApp us on
          </p>
          <a
            href="https://wa.me/447404644610"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-2xl font-black text-blue-700 underline"
          >
            07404644610
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              handleClose();
              router.push('/quiz');
            }}
          >
            Start Quiz
          </Button>
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
