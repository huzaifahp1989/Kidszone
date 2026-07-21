'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { registerOneSignalPlayerId } from '@/lib/push-notifications';
import { canRegisterWtnNotification } from '@/lib/wtn-onesignal';

const DISMISS_SESSION_KEY = 'kz_push_enable_dismissed_session_v3';
const REGISTERED_KEY_PREFIX = 'kz_push_registered_v3:';

/**
 * Visible tap-to-enable push prompt.
 * Browsers / WTN only show the OS permission dialog after a user tap.
 */
export function EnablePushPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      return;
    }

    // Clear legacy permanent dismiss flags so the prompt can show again
    try {
      localStorage.removeItem('kz_push_enable_dismissed');
      localStorage.removeItem(`kz_push_registered:${user.id}`);
      if (localStorage.getItem(`${REGISTERED_KEY_PREFIX}${user.id}`) === '1') {
        setOpen(false);
        return;
      }
      if (sessionStorage.getItem(DISMISS_SESSION_KEY) === '1') {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  if (!user?.id || !open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const enable = async () => {
    setBusy(true);
    setMessage('Opening permission prompt…');
    try {
      const playerId = await registerOneSignalPlayerId({
        attempts: 10,
        delayMs: 800,
        promptWtn: true,
        requestPermission: true,
      });

      if (playerId) {
        try {
          localStorage.setItem(`${REGISTERED_KEY_PREFIX}${user.id}`, '1');
          sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
        } catch {
          /* ignore */
        }
        setMessage('Notifications allowed — device registered!');
        window.setTimeout(() => setOpen(false), 1500);
      } else {
        setMessage(
          canRegisterWtnNotification()
            ? 'Tap Allow on the system popup. If none appeared, check phone notification settings for Kids Zone.'
            : 'Tap Allow on the browser popup. For closed-app push, open Kids Zone inside the WTN mobile app.'
        );
      }
    } catch {
      setMessage('Could not open the prompt. Try Profile → Enable push notifications.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-[80] flex justify-center px-3 sm:bottom-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-violet-400 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Bell size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sand-900">Allow notifications</p>
                <p className="mt-1 text-sm text-sand-600">
                  Tap the button below to show the system Allow prompt again.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg p-1 text-sand-400 hover:bg-sand-100 hover:text-sand-700"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={enable}
              className="mt-3 w-full rounded-xl bg-violet-700 px-4 py-3.5 text-base font-bold text-white hover:bg-violet-800 disabled:opacity-60"
            >
              {busy ? 'Waiting for Allow…' : 'Allow notifications'}
            </button>

            {message && <p className="mt-2 text-xs font-medium text-violet-800">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
