'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePointsProgress } from '@/lib/points-progress-context';
import { Heart, MessageCircle, Trophy } from 'lucide-react';
import { authJsonFetch } from '@/lib/auth-headers';
import { EarnMorePointsLinks } from '@/components/EarnMorePointsLinks';

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
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setErrorMessage('Please enter a valid number of recitations.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await authJsonFetch('/api/pledge/submit', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          type,
          subtype: type === 'durood' ? selectedDurood : selectedZikr,
          count,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not log your pledge.');
      }

      if (data.profile) {
        updateLocalProfile({
          points: data.profile.points,
          weeklyPoints: data.profile.weeklyPoints,
          monthlyPoints: data.profile.monthlyPoints,
          todayPoints: data.profile.todayPoints,
        });
      }
      await refreshProfile();

      const itemName = type === 'durood'
        ? DUROOD_OPTIONS.find(o => o.value === selectedDurood)?.label
        : ZIKR_OPTIONS.find(o => o.value === selectedZikr)?.label;

      const successMessage = `MashaAllah! You logged ${count} ${itemName}.`;
      setStatusMessage(data.message || successMessage);

      if (data.pointsAwarded > 0) {
        showPointsProgress({
          activity: type === 'durood' ? 'durood' : 'pledge',
          activityLabel: type === 'durood' ? 'Durood pledge' : 'Zikr pledge',
          pointsEarned: data.pointsAwarded,
          message: successMessage,
        });
      }

      if (type === 'durood') setDuroodCount('');
      else setZikrCount('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <EarnMorePointsLinks title="Earn more points today" />
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fff5f5] rounded-full border border-[#ff6b6b]/20">
            <Heart size={16} className="text-[#ff6b6b]" />
            <span className="text-sm font-semibold text-[#ff4757]">Track Your Worship</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1e1b4b]">Durood & Zikr Pledge</h1>
          <p className="text-[#475569] text-lg max-w-2xl mx-auto">
            Recite Durood and Zikr to purify your heart and earn rewards from Allah
          </p>
        </div>

        <div className="rounded-2xl border border-[#7c3aed]/30 bg-[#ecfeff] p-4 text-center">
          <p className="text-[#5b21b6] font-bold">
            All points for Quiz, Durood and Zikr reset on Friday night or Saturday.
          </p>
        </div>

        {!user && (
          <div className="bg-[#fffbeb] border border-[#fbbf24]/30 rounded-2xl p-6 text-center">
            <p className="text-[#b45309] font-semibold mb-3">Sign in to log your pledge and earn points</p>
            <button
              onClick={() => router.push('/signin?next=/pledge')}
              className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold rounded-xl shadow-lg"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => { setActiveTab('durood'); setStatusMessage(null); setErrorMessage(null); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'durood'
                ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] text-white shadow-lg'
                : 'bg-white text-[#1e1b4b] border border-[#c4b5fd]/30 hover:bg-[#fff5f5]'
            }`}
          >
            🌹 Durood
          </button>
          <button
            onClick={() => { setActiveTab('zikr'); setStatusMessage(null); setErrorMessage(null); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'zikr'
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white shadow-lg'
                : 'bg-white text-[#1e1b4b] border border-[#c4b5fd]/30 hover:bg-[#f5f3ff]'
            }`}
          >
            📿 Zikr
          </button>
        </div>

        <div className="text-center">
          <a
            href="https://chat.whatsapp.com/BxmFkYb0b4CCMSQwLQdF4k"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#128c7e] bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1ebe5d] transition"
            aria-label="Join WhatsApp Group"
          >
            <MessageCircle size={18} />
            Join WhatsApp Group
          </a>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#c4b5fd]/30 overflow-hidden">
          <div className={`p-6 text-white ${activeTab === 'durood' ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4757]' : 'bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]'}`}>
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
            {statusMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {statusMessage}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {errorMessage}
              </div>
            ) : null}

            {activeTab === 'durood' ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#1e1b4b] mb-2">Select Durood</label>
                  <select
                    value={selectedDurood}
                    onChange={(e) => setSelectedDurood(e.target.value)}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#c4b5fd]/30 bg-[#fff5f5]/50 text-[#1e1b4b] font-semibold focus:border-[#ff6b6b] focus:outline-none disabled:opacity-50"
                  >
                    {DUROOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1e1b4b] mb-2">How many times did you recite?</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number"
                    value={duroodCount}
                    onChange={(e) => setDuroodCount(Number(e.target.value) || '')}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#c4b5fd]/30 text-[#1e1b4b] font-semibold focus:border-[#ff6b6b] focus:outline-none disabled:opacity-50"
                  />
                  <p className="text-sm text-[#475569] mt-2">💡 +25 points per pledge (minimum 5 recitations)</p>
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
                  <label className="block text-sm font-bold text-[#1e1b4b] mb-2">Select Zikr</label>
                  <select
                    value={selectedZikr}
                    onChange={(e) => setSelectedZikr(e.target.value)}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#c4b5fd]/30 bg-[#f5f3ff]/50 text-[#1e1b4b] font-semibold focus:border-[#7c3aed] focus:outline-none disabled:opacity-50"
                  >
                    {ZIKR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1e1b4b] mb-2">How many times did you recite?</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter number"
                    value={zikrCount}
                    onChange={(e) => setZikrCount(Number(e.target.value) || '')}
                    disabled={!user}
                    className="w-full p-4 rounded-xl border-2 border-[#c4b5fd]/30 text-[#1e1b4b] font-semibold focus:border-[#7c3aed] focus:outline-none disabled:opacity-50"
                  />
                  <p className="text-sm text-[#475569] mt-2">💡 +25 points per pledge (minimum 5 recitations)</p>
                </div>
                <button
                  onClick={() => handleSubmit('zikr')}
                  disabled={loading || !zikrCount || !user}
                  className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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
          <div className="bg-[#f5f3ff] rounded-xl p-5 border border-[#7c3aed]/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📿</span>
              <div>
                <h4 className="font-bold text-[#6d28d9] mb-1">Why Zikr?</h4>
                <p className="text-sm text-[#5b21b6]">"Remember Me, and I will remember you." (Quran 2:152)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/pledge/leaderboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1e1b4b] font-bold rounded-xl border border-[#c4b5fd]/30 hover:bg-[#ede9fe] transition"
          >
            <Trophy size={20} />
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
