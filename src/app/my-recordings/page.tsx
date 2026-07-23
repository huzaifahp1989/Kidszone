'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Recording } from '@/types/stories';
import { useAuth } from '@/lib/auth-context';
import { Mic, Clock, Calendar, CheckCircle, XCircle, Hourglass, MessageSquare, RefreshCw } from 'lucide-react';

type RecordingCategory = 'quran' | 'nasheed' | 'story' | 'hadith' | 'unknown';

function getRecordingCategory(rec: Recording): RecordingCategory {
  if (rec.category === 'quran' || rec.category === 'nasheed' || rec.category === 'story') {
    return rec.category;
  }
  if (rec.story_id) return 'story';
  if (rec.title?.toLowerCase().includes('surah')) return 'quran';
  return 'unknown';
}

const CATEGORY_LABELS: Record<RecordingCategory, { label: string; emoji: string }> = {
  quran: { label: "Qur'an", emoji: '📖' },
  nasheed: { label: 'Nasheed', emoji: '🎵' },
  story: { label: 'Story', emoji: '📚' },
  hadith: { label: 'Hadith', emoji: '📜' },
  unknown: { label: 'Recording', emoji: '🎙️' },
};

function getRecordAgainHref(rec: Recording): string {
  const category = getRecordingCategory(rec);
  if (category === 'quran') return '/quran/learn';
  if (category === 'story' && rec.story_id) return `/stories/${rec.story_id}/record`;
  if (category === 'story') return '/stories';
  return '/studio';
}

function getAdminFeedback(rec: Recording): string | null {
  return rec.admin_notes?.trim() || rec.admin_feedback?.trim() || null;
}

export default function MyRecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecordings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const runQuery = async (orderColumn: 'submitted_at' | 'created_at') => {
        return await supabase
          .from('recordings')
          .select(
            `
            *,
            story:stories(title)
          `
          )
          .eq('user_id', user!.id)
          .order(orderColumn, { ascending: false });
      };

      let { data, error } = await runQuery('submitted_at');
      if (error && error.message?.includes('submitted_at')) {
        ({ data, error } = await runQuery('created_at'));
      }

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    } else {
      setLoading(false);
    }
  }, [fetchRecordings, user]);

  const stats = useMemo(() => {
    return recordings.reduce(
      (acc, rec) => {
        if (rec.status === 'approved') acc.approved += 1;
        else if (rec.status === 'rejected') acc.rejected += 1;
        else acc.pending += 1;
        return acc;
      },
      { approved: 0, rejected: 0, pending: 0 }
    );
  }, [recordings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} className="mr-1" />;
      case 'rejected': return <XCircle size={14} className="mr-1" />;
      default: return <Hourglass size={14} className="mr-1" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Pending review';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-islamic-light flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <p className="text-xl text-gray-600 mb-4">Please sign in to view your recordings.</p>
          <Link href="/signin" className="inline-block bg-islamic-primary text-white px-6 py-2 rounded-lg font-bold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-islamic-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Recordings</h1>
            <p className="text-sm text-gray-500 mt-1">
              See when your recordings are approved or rejected by the teacher.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchRecordings(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/studio"
              className="bg-islamic-primary text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition flex items-center"
            >
              <Mic size={18} className="mr-2" /> Record New
            </Link>
          </div>
        </div>

        {!loading && recordings.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-black text-yellow-800">{stats.pending}</p>
              <p className="text-xs font-semibold text-yellow-700">Pending</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-black text-green-800">{stats.approved}</p>
              <p className="text-xs font-semibold text-green-700">Approved</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-black text-red-800">{stats.rejected}</p>
              <p className="text-xs font-semibold text-red-700">Rejected</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-islamic-primary mx-auto"></div>
          </div>
        ) : recordings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No recordings yet</h3>
            <p className="text-gray-500 mb-6">
              Record Qur&apos;an, Nasheeds, Stories or Hadith and earn up to 40 points when approved!
            </p>
            <Link
              href="/studio"
              className="inline-block bg-islamic-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Open Recording Studio
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((rec) => {
              const submittedAt = rec.submitted_at || rec.created_at || new Date().toISOString();
              const reviewedAt = rec.reviewed_at;
              const durationSeconds = rec.duration ?? rec.duration_seconds ?? 0;
              const category = getRecordingCategory(rec);
              const categoryInfo = CATEGORY_LABELS[category];
              const adminFeedback = getAdminFeedback(rec);
              const title = rec.story?.title || rec.title || 'Studio Recording';

              return (
                <div
                  key={rec.id}
                  className={`bg-white rounded-2xl p-6 shadow-sm border flex flex-col gap-4 ${
                    rec.status === 'approved'
                      ? 'border-green-200'
                      : rec.status === 'rejected'
                        ? 'border-red-200'
                        : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-100">
                          <span aria-hidden>{categoryInfo.emoji}</span>
                          {categoryInfo.label}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(rec.status)}`}>
                          {getStatusIcon(rec.status)}
                          {getStatusLabel(rec.status)}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-800 mb-1">{title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1" /> Submitted {formatDate(submittedAt)}
                        </span>
                        {reviewedAt && (
                          <span className="flex items-center">
                            <CheckCircle size={14} className="mr-1" /> Reviewed {formatDate(reviewedAt)}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" /> {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {rec.status === 'approved' && (
                        <p className="mt-2 text-sm font-semibold text-green-700">
                          MashaAllah! Your recording was approved
                          {rec.points_awarded ? ` — you earned ${rec.points_awarded} points!` : '.'}
                        </p>
                      )}

                      {rec.status === 'rejected' && (
                        <p className="mt-2 text-sm font-semibold text-red-700">
                          This recording was not approved. Read the teacher&apos;s feedback below and try again!
                        </p>
                      )}

                      {rec.status === 'submitted' && (
                        <p className="mt-2 text-sm text-yellow-700">
                          Waiting for a teacher to review your recording. Check back soon!
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {rec.status === 'approved' && rec.points_awarded != null && rec.points_awarded > 0 && (
                        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg font-bold border border-yellow-100">
                          ⭐ {rec.points_awarded} pts
                        </div>
                      )}
                      {rec.status === 'rejected' && (
                        <Link
                          href={getRecordAgainHref(rec)}
                          className="inline-flex items-center gap-1 rounded-xl bg-islamic-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90"
                        >
                          <Mic size={14} /> Try again
                        </Link>
                      )}
                    </div>
                  </div>

                  {adminFeedback && (rec.status === 'approved' || rec.status === 'rejected') && (
                    <div
                      className={`rounded-xl border p-4 ${
                        rec.status === 'approved'
                          ? 'border-green-100 bg-green-50'
                          : 'border-red-100 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquare size={14} className={rec.status === 'approved' ? 'text-green-700' : 'text-red-700'} />
                        <p className={`text-xs font-bold uppercase tracking-wide ${rec.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                          Teacher feedback
                        </p>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap ${rec.status === 'approved' ? 'text-green-900' : 'text-red-900'}`}>
                        {adminFeedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
