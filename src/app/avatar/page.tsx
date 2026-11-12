'use client';

import React from 'react';
import { Smile } from 'lucide-react';
import { AvatarPicker } from '@/components/AvatarPicker';

export default function AvatarPage() {
  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-600/30 bg-white px-4 py-2">
            <Smile size={16} className="text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">My Avatar</span>
          </div>
          <h1 className="text-4xl font-bold text-teal-900 md:text-5xl">Pick Your Avatar</h1>
          <p className="text-lg text-sand-700">
            Choose a fun emoji buddy to represent you. Earn points to level up and unlock more!
          </p>
        </div>

        <AvatarPicker />
      </div>
    </div>
  );
}
