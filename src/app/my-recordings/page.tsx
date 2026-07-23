'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Recording } from '@/types/stories';
import { useAuth } from '@/lib/auth-context';
import {
  getRecordingAdminFeedback,
  getRecordingCategoryEmoji,
  getRecordingCategoryLabel,
  getRecordingStatusColor,
  getRecordingStatusLabel,
} from '@/lib/recording-display';
import { Mic, Clock, Calendar, CheckCircle2, XCircle, Hourglass } from 'lucide-react';

export default function MyRecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setRecordings([]);
        return;
      }

      const res = await fetch('/api/my-recordings', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load recordings');
      }

      const payload = await res.json();
      setRecordings(payload.recordings || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const StatusIcon = ({ status }: { status: Recording['status'] }) => {
    if (status === 'approved') return <CheckCircle2 size={16} className="text-green-600" />;
    if (status === 'rejected') return <XCircle size={16} className="text-red-600" />;
    return <Hourglass size={16} className="text-amber-600" />;
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
              See when your teacher approves or rejects your recordings and how many points you earned.
            </p>
          </div>
          <Link
            href="/studio"
            className="bg-islamic-primary text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition flex items-center justify-center"
          >
            <Mic size={18} className="mr-2" /> Record New
          </Link>
        </div>

        {!loading && recordings.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-amber-800">{stats.pending}</p>
              <p className="text-xs font-semibold text-amber-700">Pending review</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-green-800">{stats.approved}</p>
              <p className="text-xs font-semibold text-green-700">Approved</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center">
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
              Record Qur&apos;an, nasheeds, stories or hadith in the studio. Your teacher will review them and you can
              earn points!
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
              const durationSeconds = rec.duration ?? rec.duration_seconds ?? 0;
              const categoryLabel = getRecordingCategoryLabel(rec.category, rec.story?.title);
              const categoryEmoji = getRecordingCategoryEmoji(rec.category, rec.story?.title);
              const adminFeedback = getRecordingAdminFeedback(rec);
              const reviewedAt = rec.reviewed_at;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          <span aria-hidden>{categoryEmoji}</span>
                          {categoryLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getRecordingStatusColor(rec.status)}`}
                        >
                          <StatusIcon status={rec.status} />
                          {getRecordingStatusLabel(rec.status)}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {rec.story?.title || rec.title || 'Studio Recording'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1" /> Submitted {formatDate(submittedAt)}
                        </span>
                        {reviewedAt && rec.status !== 'submitted' && (
                          <span className="flex items-center">
                            <CheckCircle2 size={14} className="mr-1" /> Reviewed {formatDate(reviewedAt)}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" />{' '}
                          {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {rec.status === 'approved' && (
                        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg font-bold border border-yellow-100 text-center">
                          ⭐ +{rec.points_awarded || 0} pts
                        </div>
                      )}
                    </div>
                  </div>

                  {rec.status === 'submitted' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Your recording is waiting for your teacher to review it. Check back here — we&apos;ll show
                      approved or rejected once it&apos;s done!
                    </div>
                  )}

                  {rec.status === 'approved' && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                      <p className="font-bold">MashaAllah — approved!</p>
                      <p className="mt-1">
                        {rec.points_awarded
                          ? `You earned ${rec.points_awarded} points for this recording.`
                          : 'Your recording was approved.'}
                      </p>
                    </div>
                  )}

                  {rec.status === 'rejected' && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      <p className="font-bold">This recording was not approved.</p>
                      <p className="mt-1">Please read the feedback below, then try again in the studio.</p>
                    </div>
                  )}

                  {adminFeedback && rec.status !== 'submitted' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Teacher feedback</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{adminFeedback}</p>
                    </div>
                  )}

                  {rec.audio_url && (
                    <audio controls preload="none" src={rec.audio_url} className="h-10 w-full max-w-md" />
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
