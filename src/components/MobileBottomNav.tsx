import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/stories', label: 'Stories', icon: '📚' },
    { href: '/quiz', label: 'Quiz', icon: '🧠' },
    { href: '/tasks', label: 'Tasks', icon: '📝' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/rewards', label: 'Rewards', icon: '🎁' },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="mb-3 w-56 rounded-2xl border border-kids-primary/20 bg-white/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-kids-primary/10 text-kids-primary'
                      : 'text-gray-600 hover:bg-kids-primary/5 hover:text-kids-primary'
                  }`}
                >
                  <span className={`${isActive ? 'drop-shadow-sm' : 'opacity-80'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-kids-primary to-kids-secondary text-2xl text-white shadow-xl transition-transform hover:scale-105"
      >
        {isOpen ? '✕' : '☰'}
      </button>
    </div>
  );
};
