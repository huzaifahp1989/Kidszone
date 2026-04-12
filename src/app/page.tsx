'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { BookOpen, Gamepad2, Heart, Trophy, Sparkles, Star, Target, Zap } from 'lucide-react';

export default function Home() {
  const { profile } = useAuth();
  const user = useMemo(() => {
    const extras = (profile as unknown as { streak?: number; total_days?: number; totalDays?: number }) || {};
    return {
      username: profile?.name || 'Friend',
      points: profile?.points ?? 0,
      level: profile?.level || 'Beginner',
      streak: extras.streak ?? 0,
      totalDaysLearned: extras.total_days ?? extras.totalDays ?? 0,
    };
  }, [profile]);

  const progressPercent = useMemo(() => {
    const pct = (user.points / 500) * 100;
    return Math.max(2, Math.min(100, pct));
  }, [user.points]);

  const quickActions = [
    {
      href: '/quiz',
      icon: BookOpen,
      title: 'Daily Quiz',
      description: 'Test your knowledge',
      color: 'from-[#14b8a6] to-[#0d9488]',
      bgColor: 'bg-[#f0fdfa]',
    },
    {
      href: '/games',
      icon: Gamepad2,
      title: 'Play Games',
      description: 'Learn while having fun',
      color: 'from-[#fbbf24] to-[#f59e0b]',
      bgColor: 'bg-[#fffbeb]',
    },
    {
      href: '/pledge',
      icon: Heart,
      title: 'Durood Pledge',
      description: 'Track your dhikr',
      color: 'from-[#ff6b6b] to-[#ff4757]',
      bgColor: 'bg-[#fff5f5]',
    },
    {
      href: '/leaderboard',
      icon: Trophy,
      title: 'Leaderboard',
      description: 'See top learners',
      color: 'from-[#8b5cf6] to-[#6366f1]',
      bgColor: 'bg-[#eef2ff]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-[#e5c9a3]/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#14b8a6]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#fbbf24]/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative px-6 py-10 md:px-10 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0fdfa] rounded-full border border-[#14b8a6]/20">
                  <Sparkles size={16} className="text-[#14b8a6]" />
                  <span className="text-sm font-semibold text-[#0d9488]">Assalamu Alaikum!</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-[#6a422d]">
                  Welcome back,{' '}
                  <span className="text-gradient-warm">{user.username}</span>
                </h1>
                
                <p className="text-[#a1633a] text-lg max-w-lg">
                  Continue your Islamic learning journey. Every step brings you closer to knowledge and rewards.
                </p>
                
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href="/quiz"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <BookOpen size={20} />
                    Start Daily Quiz
                  </Link>
                  
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#6a422d] font-bold rounded-xl border-2 border-[#e5c9a3] hover:bg-[#f9f0e6] transition-all"
                  >
                    <Gamepad2 size={20} />
                    Play Games
                  </Link>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-xl rotate-3">
                    <span className="text-6xl md:text-7xl">🌟</span>
                  </div>
                  <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center shadow-lg -rotate-6">
                    <span className="text-3xl">📿</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Star, label: 'Points', value: user.points, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
            { icon: Target, label: 'Level', value: user.level, color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]' },
            { icon: Zap, label: 'Streak', value: `${user.streak || 0} days`, color: 'text-[#ff6b6b]', bg: 'bg-[#fff5f5]' },
            { icon: Trophy, label: 'Days Learning', value: user.totalDaysLearned || 0, color: 'text-[#8b5cf6]', bg: 'bg-[#eef2ff]' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`${stat.bg} rounded-2xl p-5 border border-[#e5c9a3]/20 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#6a422d]">{stat.value}</p>
                  <p className="text-sm text-[#a1633a]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Progress Section */}
        <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#e5c9a3]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
                <Target size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#6a422d]">Journey to Young Scholar</h3>
                <p className="text-sm text-[#a1633a]">Keep learning to level up!</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#14b8a6]">{user.points} / 500 ⭐</span>
          </div>
          
          <div className="h-4 bg-[#f9f0e6] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#14b8a6] via-[#fbbf24] to-[#ff6b6b] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className={`${action.bgColor} group rounded-2xl p-5 border border-[#e5c9a3]/20 hover:shadow-lg transition-all hover:-translate-y-1`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <action.icon size={24} className="text-white" />
              </div>
              <h3 className="mt-4 font-bold text-[#6a422d]">{action.title}</h3>
              <p className="text-sm text-[#a1633a]">{action.description}</p>
            </Link>
          ))}
        </section>

        {/* Featured Section */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#14b8a6] to-[#0d9488] rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3">Daily Challenge</span>
                <h3 className="text-xl font-bold mb-2">Complete Today&apos;s Quiz</h3>
                <p className="text-white/80 text-sm mb-4">Answer all questions correctly to earn bonus points and climb the leaderboard!</p>
                <Link
                  href="/quiz"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0d9488] font-bold rounded-xl hover:bg-white/90 transition"
                >
                  Start Now →
                </Link>
              </div>
              <span className="text-5xl">🎯</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3">New Games</span>
                <h3 className="text-xl font-bold mb-2">Explore Word Hunts</h3>
                <p className="text-white/80 text-sm mb-4">Find Islamic words in our new Seerah and Quran themed puzzles. Fun for all ages!</p>
                <Link
                  href="/games"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#d97706] font-bold rounded-xl hover:bg-white/90 transition"
                >
                  Play Now →
                </Link>
              </div>
              <span className="text-5xl">🎮</span>
            </div>
          </div>
        </section>

        {/* Tip Card */}
        <section className="bg-[#f0fdfa] rounded-2xl p-6 border border-[#14b8a6]/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#14b8a6] flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h4 className="font-bold text-[#0d9488] mb-1">Learning Tip</h4>
              <p className="text-[#115e59]">
                Try to learn something new about Islam every day, even if it&apos;s just one verse or one hadith. 
                Consistency is the key to building lasting knowledge. May Allah bless your journey!
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
