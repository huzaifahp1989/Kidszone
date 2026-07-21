'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components';
import { Loader2, Search, UserPlus, X } from 'lucide-react';

type SelectedWinner = {
  userId: string;
  name: string;
  email: string | null;
  madrasahName: string;
  city: string;
  hasSpunThisWeek: boolean;
  spinReward: string | null;
};

type SearchResult = {
  userId: string;
  name: string;
  email: string | null;
  madrasahName: string;
  city: string;
};

const adminHeaders = { 'x-admin-auth': 'true', 'Content-Type': 'application/json' };

export function SpinWheelWinnerPicker() {
  const [winners, setWinners] = useState<SelectedWinner[]>([]);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadWinners = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/spin-wheel/winners', {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load winners');
      setWinners(Array.isArray(data.winners) ? data.winners : []);
      setWeekStartDate(data.weekStartDate || '');
    } catch (err: any) {
      setMessage(err?.message || 'Could not load spin wheel winners.');
      setWinners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWinners();
  }, [loadWinners]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/admin/spin-wheel/winners?q=${encodeURIComponent(trimmed)}`, {
          headers: adminHeaders,
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Search failed');
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err: any) {
        setResults([]);
        setSearchError(err?.message || 'Search failed. Please try again.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const addWinner = async (userId: string) => {
    setBusyUserId(userId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/spin-wheel/winners', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add winner');
      setWinners(Array.isArray(data.winners) ? data.winners : []);
      setWeekStartDate(data.weekStartDate || weekStartDate);
      setSearch('');
      setResults([]);
      setMessage(`${data.added?.name || 'Winner'} can now spin the wheel.`);
    } catch (err: any) {
      setMessage(err?.message || 'Could not add winner.');
    } finally {
      setBusyUserId(null);
    }
  };

  const removeWinner = async (userId: string) => {
    setBusyUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/spin-wheel/winners?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove winner');
      setWinners(Array.isArray(data.winners) ? data.winners : []);
      setMessage('Winner removed from spin wheel access.');
    } catch (err: any) {
      setMessage(err?.message || 'Could not remove winner.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
      <div>
        <h3 className="text-xl font-bold text-islamic-dark">Select Spin Wheel Winners</h3>
        <p className="text-sm text-gray-600 mt-1">
          Search by name or email and add winners here. They can spin once on the Rewards page each week.
        </p>
        {weekStartDate ? (
          <p className="text-xs font-semibold text-violet-700 mt-1">Current week starts {weekStartDate}</p>
        ) : null}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search learner name or email..."
          className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {search.trim().length >= 2 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50">
          {searching ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin" /> Searching...
            </p>
          ) : searchError ? (
            <p className="px-4 py-3 text-sm text-rose-700">{searchError}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">No matching learners found.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {results.map((result) => (
                <li key={result.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{result.name}</p>
                    <p className="text-xs text-slate-600 truncate">
                      {[result.madrasahName, result.city, result.email].filter(Boolean).join(' · ') || 'No extra details'}
                    </p>
                  </div>
                  <Button
                    onClick={() => addWinner(result.userId)}
                    variant="success"
                    size="sm"
                    disabled={busyUserId === result.userId}
                  >
                    <UserPlus size={16} className="mr-1 inline" />
                    {busyUserId === result.userId ? 'Adding...' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">{message}</p>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-bold text-slate-800">Selected winners ({winners.length})</h4>
          <Button onClick={loadWinners} variant="secondary" size="sm" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading winners...</p>
        ) : winners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
            No spin wheel winners selected yet. Search above to add names.
          </p>
        ) : (
          <div className="space-y-2">
            {winners.map((winner) => (
              <div
                key={winner.userId}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{winner.name}</p>
                  <p className="text-xs text-slate-600">
                    {[winner.madrasahName, winner.city, winner.email].filter(Boolean).join(' · ') || 'No extra details'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-violet-700">
                    {winner.hasSpunThisWeek
                      ? `Spun this week: ${winner.spinReward || 'Yes'}`
                      : 'Not spun yet this week'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeWinner(winner.userId)}
                  disabled={busyUserId === winner.userId}
                  className="rounded-lg border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  aria-label={`Remove ${winner.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
