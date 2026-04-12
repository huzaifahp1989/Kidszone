'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addPoints } from '@/lib/profile-service';
import { supabase } from '@/lib/supabase';
import { Heart, Sparkles, Trophy } from 'lucide-react';

const DUROOD_OPTIONS = [
  { label: 'Salallahu Alayhi Wasallam', value: 'short_durood' },
  { label: 'Durood Ibrahim', value: 'durood_ibrahim' },
  { label: 'Jazallahu Anna Sayyidina Muhammadan', value: 'jazallah_durood' },
];

const ZIKR_OPTIONS = [
  { label: 'SubhanAllah', value: 'subhanallah' },
  { label: 'Alhamdulillah', value: 'alhamdulillah' },
  { label: 'Allahu Akbar', value: 'allahu_akbar' },
  { label: 'La ilaha illallah', value: 'kalima_tayyiba' },
  { label: 'Astaghfirullah', value: 'astaghfirullah' },
  { label: 'SubhanAllahi wa bihamdihi', value: 'subhanallah_wb' },
];

export default function PledgeClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'durood' | 'zikr'>('durood');

  const [selectedDurood, setSelectedDurood] = useState(DUROOD_OPTIONS[0].value);
  const [duroodCount, setDuroodCount] = useState<number | ''>('');
  const [selectedZikr, setSelectedZikr] = useState(ZIKR_OPTIONS[0].value);
  const [zikrCount, setZikrCount] = useState<number | ''>('');

  const handleSubmit = async (type: 'durood' | 'zikr') => {
    if (!user) {
      router.replace('/signin?message=' + encodeURIComponent('Please sign in to log your Durood/Zikr.') + '&next=' + encodeURIComponent('/pledge'));
      return;
    }

    const count = type === 'durood' ? Number(duroodCount) : Number(zikrCount);
    if (!count || count <= 0) {
      alert('Please enter a valid number of recitations.');
      return;
    }

    const points = Math.floor(count * 0.2);
    setLoading(true);

    try {
      const updated = await addPoints(user.id, points);
      if (!updated) throw new Error('Could not award points.');

      await supabase.from('pledges').insert({
        user_id: user.id,
        type: type,
        subtype: type === 'durood' ? selectedDurood : selectedZikr,
        count: count,
      });

      const itemName = type === 'durood' 
        ? DUROOD_OPTIONS.find(o => o.value === selectedDurood)?.label 
        : ZIKR_OPTIONS.find(o => o.value === selectedZikr)?.label;

      setSuccessMessage(`MashaAllah! You logged ${count} ${itemName} and earned ${points} points!`);

      if (type === 'durood') setDuroodCount('');
      else setZikrCount('');
    } catch (error) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fff5f5] rounded-full border border-[#ff6b6b]/20">
            <Heart size={16} className="text-[#ff6b6b]" />
            <span className="text-sm font-semibold text-[#ff4757]">Track Your Worship</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#6a422d]">Durood & Zikr Pledge</h1>
          <p className="text-[#a1633a] text-lg max-w-2xl mx-auto">
            Recite Durood and Zikr to purify your heart and earn rewards from Allah
          </p>
        </div>

        {!user && (
          <div className="bg-[#fffbeb] border border-[#fbbf24]/30 rounded-2xl p-6 text-center">
            <p className="text-[#b45309] font-semibold mb-3">Sign in to log your pledge and earn points</p>
            <button
              onClick={() => router.push('/signin?next=/pledge')}
              className="px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-lg"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveTab('durood')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'durood'
                ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] text-white shadow-lg'
                : 'bg-white text-[#6a422d] border border-[#e5c9a3]/30 hover:bg-[#fff5f5]'
            }`}
          >
            🌹 Durood
          </button>
          <button
            onClick={() => setActiveTab('zikr')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'zikr'
                ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white shadow-lg'
                : 'bg-white text-[#6a422d] border border-[#e5c9a3]/30 hover:bg-[#f0fdfa]'
            }`}
          >
            📿 Zikr
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 overflow-hidden">
          <div className={`p-6 text-white ${activeTab === 'durood' ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4757]' : 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488]'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-3xl">{activeTab === 'durood' ? '🌹' : '📿'}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{activeTab === 'durood' ? 'Durood Shareef' : 'Daily Zikr'}</h2>
                <p className="text-white/80">{activeTab === 'durood' ? 'Send blessings upon the Prophet ﷺ' : 'Remember Allah throughout your day'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {activeTab === 'durood' ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#6a422d] mb-2">Select Durood</label>
                  <select
                    value={selectedDurood}
                    onChange={(e) => setSelectedDurood(e.target.value)}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#e5c9a3]/30 bg-[#fff5f5]/50 text-[#6a422d] font-semibold focus:border-[#ff6b6b] focus:outline-none disabled:opacity-50"
                  >
                    {DUROOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#6a422d] mb-2">How many times did you recite?</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number"
                    value={duroodCount}
                    onChange={(e) => setDuroodCount(Number(e.target.value) || '')}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#e5c9a3]/30 text-[#6a422d] font-semibold focus:border-[#ff6b6b] focus:outline-none disabled:opacity-50"
                  />
                  <p className="text-sm text-[#a1633a] mt-2">💡 100 recitations = 20 points</p>
                </div>
                <button
                  onClick={() => handleSubmit('durood')}
                  disabled={loading || !duroodCount || !user}
                  className="w-full py-4 bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Logging...' : 'Log Durood'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#6a422d] mb-2">Select Zikr</label>
                  <select
                    value={selectedZikr}
                    onChange={(e) => setSelectedZikr(e.target.value)}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#e5c9a3]/30 bg-[#f0fdfa]/50 text-[#6a422d] font-semibold focus:border-[#14b8a6] focus:outline-none disabled:opacity-50"
                  >
                    {ZIKR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#6a422d] mb-2">How many times did you recite?</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number"
                    value={zikrCount}
                    onChange={(e) => setZikrCount(Number(e.target.value) || '')}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#e5c9a3]/30 text-[#6a422d] font-semibold focus:border-[#14b8a6] focus:outline-none disabled:opacity-50"
                  />
                  <p className="text-sm text-[#a1633a] mt-2">💡 100 recitations = 20 points</p>
                </div>
                <button
                  onClick={() => handleSubmit('zikr')}
                  disabled={loading || !zikrCount || !user}
                  className="w-full py-4 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Logging...' : 'Log Zikr'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#fff5f5] rounded-xl p-5 border border-[#ff6b6b]/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌹</span>
              <div>
                <h4 className="font-bold text-[#ff4757] mb-1">Why Durood?</h4>
                <p className="text-sm text-[#b8323e]">"Whoever sends blessings upon me once, Allah will send blessings upon him ten times." (Muslim)</p>
              </div>
            </div>
          </div>
          <div className="bg-[#f0fdfa] rounded-xl p-5 border border-[#14b8a6]/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📿</span>
              <div>
                <h4 className="font-bold text-[#0d9488] mb-1">Why Zikr?</h4>
                <p className="text-sm text-[#0f766e]">"Remember Me, and I will remember you." (Quran 2:152)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/pledge/leaderboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#6a422d] font-bold rounded-xl border border-[#e5c9a3]/30 hover:bg-[#f9f0e6] transition"
          >
            <Trophy size={20} />
            View Leaderboard
          </button>
        </div>

        {/* Success Modal */}
        {successMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto">
                <Sparkles size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#6a422d]">Pledge Recorded!</h3>
              <p className="text-[#a1633a]">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="w-full py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl"
              >
                Alhamdulillah
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
