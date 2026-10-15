'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, RotateCcw, ArrowLeft } from 'lucide-react';
import { POINTS_CONFIG_DEFAULTS } from '@/lib/points-config';

type ConfigMap = Record<string, number>;

const FIELD_META: Record<string, { label: string; hint: string }> = {
  quiz_correct: { label: 'Quiz (per correct completion)', hint: 'Points awarded for completing a quiz.' },
  game_activity: { label: 'Game activity', hint: 'Points awarded for completing a game activity.' },
  arabic_activity: { label: 'Arabic activity', hint: 'Points awarded for completing an Arabic learning activity.' },
  quran_activity: { label: 'Quran activity', hint: 'Points awarded for completing a Quran learning activity.' },
  daily_bonus: { label: 'Daily challenge bonus', hint: 'Bonus points for completing all daily missions.' },
  weekly_bonus: { label: 'Weekly bonus', hint: 'Bonus points for weekly activities.' },
  milestone_bonus: { label: 'Weekly milestone bonus', hint: 'Bonus awarded when a learner hits the weekly activity milestone.' },
  milestone_threshold: { label: 'Weekly milestone threshold', hint: 'Number of weekly activities required to unlock the milestone bonus.' },
};

export default function PointsConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    loadConfig();
  }, [router]);

  const loadConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/points-config', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load config');
      setConfig(data.config || {});
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Could not load points config' });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/points-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMessage({ type: 'ok', text: 'Points configuration saved successfully.' });
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Could not save points config' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!confirm('Reset all values to defaults?')) return;
    setConfig({ ...POINTS_CONFIG_DEFAULTS });
    setMessage({ type: 'ok', text: 'Values reset to defaults. Click Save to persist.' });
  };

  const keys = Object.keys(POINTS_CONFIG_DEFAULTS);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-6 rounded-2xl mb-6 flex items-center justify-between shadow-xl">
          <div>
            <h1 className="text-3xl font-bold">Points Configuration</h1>
            <p className="text-white/80 mt-1">Adjust points awarded across activities, bonuses, and milestones.</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-xl p-4 text-sm font-semibold ${
              message.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Scoring values</h2>
                <div className="flex gap-2">
                  <button
                    onClick={resetToDefaults}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={14} /> Reset defaults
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {keys.map((key) => {
                  const meta = FIELD_META[key] || { label: key, hint: '' };
                  const value = config[key] ?? POINTS_CONFIG_DEFAULTS[key];
                  const isDefault = value === POINTS_CONFIG_DEFAULTS[key];
                  return (
                    <div key={key} className="px-6 py-4 grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-4 items-center">
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-2">
                          {meta.label}
                          {isDefault ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">default</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">custom</span>
                          )}
                        </p>
                        {meta.hint && <p className="text-xs text-slate-500 mt-0.5">{meta.hint}</p>}
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={value}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-right font-bold text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Changes take effect immediately for new activity awards. Existing points are not modified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
