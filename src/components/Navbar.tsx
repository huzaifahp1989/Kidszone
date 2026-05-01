import React, { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, Home, Gamepad2, Trophy, BookOpen, Gift, Heart, ClipboardList } from 'lucide-react';

interface NavbarUser {
  name: string;
  points: number;
  level: string;
  badges?: number;
}

interface NavbarProps {
  username?: string;
  points?: number;
  level?: string;
  badges?: number;
  onLogout?: () => void | Promise<void>;
  user?: NavbarUser | null;
  loading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ username, points, level, badges, onLogout, user, loading }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayUsername = username || user?.name;
  const displayPoints = points !== undefined ? points : user?.points;
  const displayLevel = level || user?.level;
  const displayBadges = badges !== undefined ? badges : user?.badges;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/quiz', label: 'Daily Quiz', icon: BookOpen },
    { href: '/games', label: 'Games', icon: Gamepad2 },
    { href: '/pledge', label: 'Pledge', icon: Heart },
    { href: '/tasks', label: 'Tasks', icon: ClipboardList },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/rewards', label: 'Rewards', icon: Gift },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#e5c9a3]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
              <span className="text-xl">🌙</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#0d9488] to-[#ff6b6b] bg-clip-text text-transparent">
                Kids Zone
              </h1>
              <p className="text-[10px] text-[#a1633a] -mt-1 font-medium">Islamic Learning</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#6a422d] hover:bg-[#f0fdfa] hover:text-[#0d9488] font-semibold text-sm transition-all"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="h-9 w-28 rounded-xl bg-slate-200" />
                <div className="h-9 w-16 rounded-xl bg-slate-200" />
              </div>
            ) : displayUsername ? (
              <>
                <div className="flex items-center gap-2 bg-gradient-to-r from-[#fff5f5] to-[#f0fdfa] px-4 py-2 rounded-xl border border-[#e5c9a3]/30">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#6a422d]">{displayUsername}</p>
                    <p className="text-xs text-[#a1633a]">{displayLevel || 'Beginner'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white px-3 py-2 rounded-xl shadow-md">
                    <p className="text-xs font-bold">⭐ {displayPoints || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white px-3 py-2 rounded-xl shadow-md">
                    <p className="text-xs font-bold">🏆 {displayBadges || 0}</p>
                  </div>
                </div>
                
                {onLogout && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        setIsLoggingOut(true);
                        if (onLogout) {
                          await onLogout();
                        }
                      } catch (error) {
                        console.error('Logout error:', error);
                        setIsLoggingOut(false);
                      }
                    }}
                    disabled={isLoggingOut}
                    className="p-2 text-[#ff6b6b] hover:bg-[#fff5f5] rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut size={20} />
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/signin"
                  className="px-4 py-2 text-[#6a422d] font-semibold hover:bg-[#f9f0e6] rounded-xl transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-[#6a422d] hover:bg-[#f9f0e6] rounded-xl transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#e5c9a3]/30">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#6a422d] hover:bg-[#f0fdfa] hover:text-[#0d9488] font-semibold transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              ))}
              
              <div className="mt-4 pt-4 border-t border-[#e5c9a3]/30">
                {displayUsername ? (
                  <div className="space-y-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#6a422d]">{displayUsername}</p>
                        <p className="text-sm text-[#a1633a]">{displayLevel || 'Beginner'}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-sm font-bold text-[#f59e0b]">⭐ {displayPoints || 0}</span>
                        <span className="text-sm font-bold text-[#0d9488]">🏆 {displayBadges || 0}</span>
                      </div>
                    </div>
                    
                    {onLogout && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            setIsLoggingOut(true);
                            if (onLogout) {
                              await onLogout();
                              setIsMenuOpen(false);
                            }
                          } catch (error) {
                            console.error('Logout error:', error);
                            setIsLoggingOut(false);
                          }
                        }}
                        disabled={isLoggingOut}
                        className="w-full flex items-center justify-center gap-2 bg-[#fff5f5] text-[#ff6b6b] font-semibold px-4 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut size={18} />
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    )}
                  </div>
                ) : loading ? (
                  <div className="flex flex-col gap-2 px-4 animate-pulse">
                    <div className="h-10 rounded-xl bg-slate-200" />
                    <div className="h-10 rounded-xl bg-slate-200" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-4">
                    <Link
                      href="/signin"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-center py-3 text-[#6a422d] font-semibold hover:bg-[#f9f0e6] rounded-xl transition"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-center py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-semibold rounded-xl transition"
                    >
                      Join Free
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
