import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const MobileBottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/stories', label: 'Stories', icon: '📚' },
    { href: '/quiz', label: 'Quiz', icon: '🧠' },
    { href: '/games', label: 'Games', icon: '🎮' },
    { href: '/rewards', label: 'Rewards', icon: '🎁' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-kids-primary/20 shadow-lg z-50 md:hidden rounded-t-3xl pb-safe">
      <div className="flex justify-around items-center p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-kids-primary/10 text-kids-primary -translate-y-2'
                  : 'text-gray-400 hover:text-kids-primary/60'
              }`}
            >
              <span className={`text-2xl mb-1 filter ${isActive ? 'drop-shadow-sm' : 'grayscale opacity-70'}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold ${isActive ? 'scale-110' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
