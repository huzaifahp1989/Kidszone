'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { WeeklyWinnerDisplay } from '@/components/WeeklyWinnerDisplay';

const DailyChecklist = dynamic(() => import('@/components/DailyChecklist'), { ssr: false });

export default function TrackerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="mb-6 flex items-center text-slate-600 hover:text-islamic-blue font-medium transition"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        
        <div className="mb-8">
          <WeeklyWinnerDisplay />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-islamic-dark mb-2 islamic-shadow">
            My Daily Tracker
          </h1>
          <p className="text-slate-600">Keep track of your prayers and good deeds every day.</p>
        </div>

        <DailyChecklist />
      </div>
    </div>
  );
}
