'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button } from '@/components';

export function RamadanPopup() {
  const [showRamadanPopup, setShowRamadanPopup] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeen = window.localStorage.getItem('ramadan_popup_2025_4');
    return !hasSeen;
  });
  const router = useRouter();

  if (!showRamadanPopup) return null;

  return (
    <Modal
      isOpen={showRamadanPopup}
      onClose={() => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('ramadan_popup_2025_4', 'true');
        }
        setShowRamadanPopup(false);
      }}
      title="Ramadan Updates"
      size="lg"
    >
      <div className="space-y-4 text-slate-700 text-sm sm:text-base text-center">
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="font-bold text-lg text-purple-800 mb-2">✨ New Ways to Win Prizes! ✨</h3>
          
          <div className="space-y-3">
            <div 
              onClick={() => {
                setShowRamadanPopup(false);
                router.push('/quiz');
              }}
              className="p-3 bg-white rounded-lg shadow-sm border border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors"
            >
              <p className="font-bold text-islamic-primary">🧠 Daily Quiz</p>
              <p className="text-sm">Take the daily quiz to earn points and win prizes!</p>
            </div>
            
            <div 
              onClick={() => {
                setShowRamadanPopup(false);
                router.push('/pledge');
              }}
              className="p-3 bg-white rounded-lg shadow-sm border border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors"
            >
              <p className="font-bold text-rose-500">📿 Durood & Zikr Pledge</p>
              <p className="text-sm">Recite Durood and Zikr to earn points and win prizes!</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('ramadan_popup_2025_4', 'true');
              }
              setShowRamadanPopup(false);
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
