'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Star, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type ChecklistItem = {
  id: string;
  label: string;
  icon: string;
  section: 'salah' | 'dhikr';
};

const ITEMS: ChecklistItem[] = [
  // Salah
  { id: 'fajr', label: 'Fajr', icon: '🌅', section: 'salah' },
  { id: 'dhuhr', label: 'Dhuhr', icon: '☀️', section: 'salah' },
  { id: 'asr', label: 'Asr', icon: '🌤️', section: 'salah' },
  { id: 'maghrib', label: 'Maghrib', icon: '🌇', section: 'salah' },
  { id: 'isha', label: 'Isha', icon: '🌙', section: 'salah' },
  // Dhikr
  { id: 'durood', label: 'Durood Recited', icon: '📿', section: 'dhikr' },
  { id: 'mulk', label: 'Surah Al-Mulk', icon: '📖', section: 'dhikr' },
  { id: 'waqiah', label: 'Surah Al-Waqiah', icon: '💰', section: 'dhikr' },
  { id: 'yaseen', label: 'Surah Yaseen', icon: '❤️', section: 'dhikr' },
];

export default function DailyChecklist() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [goodDeed, setGoodDeed] = useState('');
  const [pointsToday, setPointsToday] = useState(0);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`/api/daily-checklist?userId=${user.id}`);
      if (!res.ok) {
        throw new Error(`Failed to load data: ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        setCompletedItems(result.data.completed_items || []);
        setGoodDeed(result.data.good_deed || '');
        setPointsToday(result.data.daily_points || 0);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load checklist');
    } finally {
      setChecklistLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setChecklistLoading(false);
      return;
    }
    setChecklistLoading(true);
    fetchData();
  }, [user?.id, authLoading, fetchData]);

  const saveData = async (newItems: string[], newDeed: string) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/daily-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          items: newItems,
          goodDeed: newDeed
        })
      });
      const data = await res.json();
      if (data.success) {
        setPointsToday(data.points);
        // Refresh global user profile to update total points in navbar/sidebar
        refreshProfile();
      }
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (id: string) => {
    const isCompleted = completedItems.includes(id);
    let newItems;
    if (isCompleted) {
      newItems = completedItems.filter(i => i !== id);
    } else {
      newItems = [...completedItems, id];
    }
    setCompletedItems(newItems);
    saveData(newItems, goodDeed);
  };

  const handleDeedBlur = () => {
    saveData(completedItems, goodDeed);
  };

  if (authLoading || checklistLoading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-blue mx-auto mb-4"></div>
        <p className="text-slate-500">Loading your daily tracker...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Login Required</h3>
        <p className="text-slate-500">Please sign in to track your daily good deeds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-3xl border border-red-100">
        <div className="text-red-500 mb-2">⚠️ {error}</div>
        <button 
          onClick={() => { setError(null); setChecklistLoading(true); fetchData(); }}
          className="text-sm text-red-700 underline hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-islamic-blue to-cyan-500 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern.png')] opacity-10"></div>
        <h2 className="text-2xl font-bold relative z-10">My Daily Deeds</h2>
        <p className="opacity-90 relative z-10">Tick the boxes and earn Jannah points!</p>
        
        <div className="mt-4 inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
          <Star className="text-yellow-300 fill-yellow-300 mr-2 animate-pulse" />
          <span className="font-bold text-xl">{pointsToday} Points Today</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Salah Section */}
        <section>
          <h3 className="flex items-center text-lg font-bold text-islamic-dark mb-4">
            <span className="bg-indigo-100 p-2 rounded-lg mr-2">🕌</span> Daily Salah
            <span className="ml-auto text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">2 pts each</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ITEMS.filter(i => i.section === 'salah').map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                  completedItems.includes(item.id)
                    ? 'border-green-500 bg-green-50 shadow-md transform scale-[1.02]'
                    : 'border-slate-100 bg-slate-50 hover:border-indigo-200'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={`font-semibold ${completedItems.includes(item.id) ? 'text-green-700' : 'text-slate-600'}`}>
                  {item.label}
                </span>
                {completedItems.includes(item.id) && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5">
                    <Check size={12} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Dhikr Section */}
        <section>
          <h3 className="flex items-center text-lg font-bold text-islamic-dark mb-4">
            <span className="bg-teal-100 p-2 rounded-lg mr-2">📿</span> Dhikr & Quran
            <span className="ml-auto text-xs font-normal text-teal-600 bg-teal-50 px-2 py-1 rounded-full">2 pts each</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ITEMS.filter(i => i.section === 'dhikr').map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 text-left ${
                  completedItems.includes(item.id)
                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-teal-200'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={`font-medium flex-1 ${completedItems.includes(item.id) ? 'text-teal-700' : 'text-slate-600'}`}>
                  {item.label}
                </span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  completedItems.includes(item.id) ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                }`}>
                  {completedItems.includes(item.id) && <Check size={14} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Good Deed Section */}
        <section className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
          <h3 className="flex items-center text-lg font-bold text-orange-800 mb-2">
            <Heart className="mr-2 fill-orange-400 text-orange-500" /> 
            Good Deed of the Day
          </h3>
          <p className="text-sm text-orange-700 mb-3">Did you help someone or share today? Write it down!</p>
          <div className="relative mb-3">
            <textarea
              value={goodDeed}
              onChange={(e) => setGoodDeed(e.target.value)}
              placeholder="I helped my mom with..."
              className="w-full p-4 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition bg-white min-h-[80px]"
            />
            {goodDeed.length > 5 && (
              <div className="absolute bottom-3 right-3 text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded-full">
                +2 pts
              </div>
            )}
          </div>
          <button
            onClick={handleDeedBlur}
            disabled={saving || goodDeed.length < 3}
            className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              saving || goodDeed.length < 3
                ? 'bg-orange-200 text-orange-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
            }`}
          >
            {saving ? 'Saving...' : 'Submit Good Deed'}
          </button>
        </section>
        
        <div className="text-center text-xs text-slate-400">
           Charts reset automatically at midnight.
        </div>
      </div>
    </div>
  );
}
