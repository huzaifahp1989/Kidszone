'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components';

interface LeaderboardEntry {
  userId: string;
  name: string;
  count: number;
}

export default function PledgeLeaderboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'durood' | 'zikr'>('durood');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: pledges, error } = await supabase
        .from('pledges')
        .select('user_id, count, type')
        .eq('type', activeTab);

      if (error) {
        console.error('Error fetching pledges:', error);
        setLeaders([]);
        return;
      }

      // Aggregate counts by user_id
      const countsByUser: Record<string, number> = {};
      pledges?.forEach((p: any) => {
        countsByUser[p.user_id] = (countsByUser[p.user_id] || 0) + p.count;
      });

      const userIds = Object.keys(countsByUser);
      if (userIds.length === 0) {
        setLeaders([]);
        setLoading(false);
        return;
      }

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('uid, name, email')
        .in('uid', userIds);

      if (userError) {
        console.error('Error fetching users:', userError);
      }

      // Create user map with fallback to email username if name is not available
      const userMap = new Map<string, string>();
      users?.forEach((u: any) => {
        let displayName = u.name;
        // If no name or name looks like a UUID, try to use email username
        if (!displayName || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayName)) {
          if (u.email && u.email.includes('@')) {
            displayName = u.email.split('@')[0];
          } else {
            displayName = 'Friend';
          }
        }
        userMap.set(u.uid, displayName);
      });

      const leaderboardData: LeaderboardEntry[] = userIds.map((uid) => ({
        userId: uid,
        name: userMap.get(uid) || 'Friend',
        count: countsByUser[uid]
      }));

      // Sort by count descending
      leaderboardData.sort((a, b) => b.count - a.count);

      setLeaders(leaderboardData);

    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-kids-bg pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-islamic-primary font-fredoka">
            🏆 Pledge Leaderboard
          </h1>
          <p className="text-lg text-slate-600">
            See who is leading in earning rewards from Allah!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('durood')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${
              activeTab === 'durood'
                ? 'bg-rose-500 text-white shadow-lg scale-105'
                : 'bg-white text-rose-500 border-2 border-rose-100 hover:bg-rose-50'
            }`}
          >
            🌹 Durood Leaders
          </button>
          <button
            onClick={() => setActiveTab('zikr')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${
              activeTab === 'zikr'
                ? 'bg-emerald-500 text-white shadow-lg scale-105'
                : 'bg-white text-emerald-500 border-2 border-emerald-100 hover:bg-emerald-50'
            }`}
          >
            📿 Zikr Leaders
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100 min-h-[300px]">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-xl">No pledges yet!</p>
              <p>Be the first to pledge!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => (
                <div 
                  key={leader.userId}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    index === 0 ? 'bg-yellow-50 border-yellow-200' :
                    index === 1 ? 'bg-slate-50 border-slate-200' :
                    index === 2 ? 'bg-orange-50 border-orange-200' :
                    'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-slate-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{leader.name}</p>
                      <p className="text-xs text-slate-500">MashaAllah!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${
                      activeTab === 'durood' ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {leader.count.toLocaleString()}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'durood' ? 'Duroods' : 'Zikrs'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="secondary" onClick={() => router.push('/pledge')}>
            Back to Pledge
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

      </div>
    </div>
  );
}
