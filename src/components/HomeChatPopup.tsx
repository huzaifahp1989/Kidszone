'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChatWidget } from '@/components/ChatWidget';

const IDLE_CLOSE_MS = 90_000;

export function HomeChatPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeChat = useCallback(() => setOpen(false), []);

  const resetIdleTimer = useCallback(() => {
    if (!open) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setOpen(false), IDLE_CLOSE_MS);
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeChat();
  }, [pathname, closeChat]);

  useEffect(() => {
    if (!open) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    resetIdleTimer();

    const onActivity = () => resetIdleTimer();
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeChat();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('touchstart', onActivity);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [open, closeChat, resetIdleTimer]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={reduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="above-mobile-tabbar fixed left-4 z-[9998] flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-2xl sm:bottom-6 sm:left-6"
            style={{ maxHeight: 'min(70vh, 520px)' }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <div>
                  <p className="text-sm font-bold leading-tight">Chat with Kids Zone</p>
                  <p className="text-[11px] text-violet-100">We reply in chat &amp; by email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="rounded-lg p-1.5 text-violet-100 transition hover:bg-white/15 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatWidget variant="popup" active={open} onActivity={resetIdleTimer} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          initial={reduceMotion ? undefined : { scale: 0.9, opacity: 0 }}
          animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          onClick={() => setOpen(true)}
          className="above-mobile-tabbar fixed left-4 z-[9997] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-xl ring-2 ring-white/60 sm:bottom-6 sm:left-6"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </motion.button>
      )}
    </>,
    document.body
  );
}
