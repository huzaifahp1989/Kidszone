'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';

interface LeaderboardEntry {
  userId: string;
  name: string;
  count: number;
  winnerTick?: boolean;
}

export default function PledgeLeaderboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'durood' | 'zikr'>('durood');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pledge/leaderboard?type=${activeTab}`, { cache: 'no-store' });
      const payload = await res.json();

      if (!res.ok || !payload?.success) {
        console.error('Error fetching pledge leaderboard:', payload?.error || 'Unknown error');
        setLeaders([]);
        setError(payload?.error || 'Could not load leaderboard.');
        return;
      }

      setLeaders((payload.leaders || []) as LeaderboardEntry[]);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Could not load leaderboard. Please try again.');
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <p className="text-xl font-semibold">Could not load leaderboard</p>
              <p className="text-sm text-slate-500 mt-2">{error}</p>
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
                      <p className="font-bold text-slate-800 text-lg inline-flex items-center gap-2">
                        <span>{leader.name}</span>
                        {leader.winnerTick && <span aria-label="Winner" className="text-emerald-600">✓</span>}
                      </p>
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
