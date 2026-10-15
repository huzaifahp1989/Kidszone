'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

type SignupPromptPopupProps = {
  user?: { id?: string } | null;
  pathname?: string;
};

const SESSION_ID = 'signup-prompt-popup';

export function SignupPromptPopup({ user = null, pathname = '/' }: SignupPromptPopupProps) {
  const router = useRouter();

  React.useEffect(() => {
    if (user || typeof window === 'undefined') return;
    if (pathname !== '/') return;
    if (!canShowSessionPopup(SESSION_ID)) return;
    markSessionPopupShown(SESSION_ID);
  }, [user, pathname]);

  if (user || pathname !== '/') return null;

  return (
    <button
      type="button"
      aria-label="Sign up to start taking part"
      onClick={() => router.push('/signup')}
      className="fixed bottom-24 right-4 z-[80] flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(76,29,149,0.45)] transition hover:scale-[1.02] hover:shadow-[0_16px_36px_rgba(76,29,149,0.5)] active:scale-[0.98] sm:bottom-28 sm:right-6"
      title="Sign up to start taking part"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <UserPlus size={18} />
      </span>
      <span className="hidden sm:inline">Sign up</span>
    </button>
  );
}
