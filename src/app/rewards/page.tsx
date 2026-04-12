'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navbar, Button } from '@/components';
import { Trophy, Star, Award, Lock, Crown } from 'lucide-react';
import Link from 'next/link';

export default function RewardsPage() {
  const { profile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-pulse text-xl text-islamic-blue">Loading Rewards...</div>
        </div>
      </div>
    );
  }

  const totalPoints = Number(profile?.points ?? 0);
  const badgeCount = Number(profile?.badges ?? 0);
  // 1 badge every 100 points
  const pointsPerBadge = 100;
  const nextBadgePoints = (badgeCount + 1) * pointsPerBadge;
  const pointsToNext = Math.max(0, nextBadgePoints - totalPoints);
  const progressPercent = Math.min(100, ((pointsPerBadge - pointsToNext) / pointsPerBadge) * 100);

  // Level Logic
  const level = Number(profile?.level ?? 1);
  const nextLevel = level + 1;
  const badgesPerLevel = 5;
  const badgesToNextLevel = Math.max(0, (nextLevel - 1) * badgesPerLevel - badgeCount);

  // Weekly Winners (Mock or fetch from DB if available)
  // For now we will show a placeholder or fetch if we implement a public endpoint
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={40} />
            My Rewards & Badges
            <Trophy className="text-yellow-500" size={40} />
          </h1>
          <p className="text-lg text-gray-600">
            Earn 1 Badge for every <span className="font-bold text-islamic-blue">100 Points</span>!
          </p>
           <p className="text-md text-gray-500 mt-2">
            Every 5 Badges upgrades your <strong>Level</strong> for Prize Runner!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Total Points</div>
            <div className="text-4xl font-bold text-islamic-blue">{totalPoints}</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Badges Earned</div>
            <div className="text-4xl font-bold text-yellow-500">{badgeCount}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 text-center">
            <div className="text-gray-500 text-sm mb-1 uppercase tracking-wider">Current Level</div>
            <div className="text-2xl font-bold text-purple-600">
              Level {level}
            </div>
          </div>
        </div>


        {/* Next Badge Progress */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Next Badge Progress</h3>
              <p className="text-gray-500 text-sm">
                {pointsToNext} more points to reach Badge #{badgeCount + 1}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-islamic-blue">{Math.floor(progressPercent)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
             <div 
              className="h-full bg-gradient-to-r from-islamic-blue to-islamic-green transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
         {/* Next Level Progress */}
         <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Next Level Progress</h3>
              <p className="text-gray-500 text-sm">
                {badgesToNextLevel} more badges to reach Level {nextLevel}
              </p>
            </div>
            <div className="text-right">
               {/* 5 badges per level. Current progress = (badges % 5) / 5 */}
              <span className="text-2xl font-bold text-purple-600">{Math.floor(((badgeCount % badgesPerLevel) / badgesPerLevel) * 100)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
             <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${((badgeCount % badgesPerLevel) / badgesPerLevel) * 100}%` }}
            />
          </div>
        </div>

        {/* Badges Grid */}
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Award className="text-rose-500" />
          Your Collection
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Render Earned Badges */}
          {Array.from({ length: badgeCount }).map((_, i) => (
            <div key={`badge-${i}`} className="aspect-square bg-gradient-to-br from-yellow-100 to-amber-50 rounded-2xl flex flex-col items-center justify-center p-4 border-2 border-yellow-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="bg-yellow-400 text-white w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform">
                <Star size={32} fill="currentColor" />
              </div>
              <span className="font-bold text-amber-800">Badge #{i + 1}</span>
              <span className="text-xs text-amber-600 mt-1">Unlocked</span>
            </div>
          ))}

          {/* Render Next Locked Badge */}
          <div className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 opacity-70">
            <div className="bg-gray-200 text-gray-400 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <Lock size={32} />
            </div>
            <span className="font-bold text-gray-500">Badge #{badgeCount + 1}</span>
            <span className="text-xs text-gray-400 mt-1">{nextBadgePoints} Points</span>
          </div>

          {/* Placeholders */}
          {Array.from({ length: Math.max(0, 4 - (badgeCount % 5)) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="aspect-square bg-transparent rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gray-50"></div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/quiz">
            <Button size="lg" className="bg-islamic-blue hover:bg-islamic-blue/90 text-white px-8">
              Earn More Points in Quiz
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
