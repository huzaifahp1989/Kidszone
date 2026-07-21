import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
        initial={reduceMotion ? undefined : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.96 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={`${sizeClasses[size]} surface-card max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl shadow-panel sm:max-h-[90vh] sm:rounded-3xl`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-200/80 bg-gradient-to-r from-violet-50/95 to-sand-50/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-5">
            <h2 className="font-heading text-base font-bold text-violet-900 sm:text-2xl">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-xl p-1 text-sand-500 transition hover:bg-coral-50 hover:text-coral-500 interactive-focus touch-target"
              aria-label="Close modal"
            >
              <X size={28} />
            </button>
          </div>
          <div className="px-4 py-4 sm:p-6">
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
  );
};
