'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Recording } from '@/types/stories';
import { WeeklyWinnerDisplay } from '@/components/WeeklyWinnerDisplay';
import { useAuth } from '@/lib/auth-context';
import { Mic, Clock, Calendar, ChevronRight } from 'lucide-react';

export default function MyRecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRecordings = async () => {
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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
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
        <WeeklyWinnerDisplay />
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Recordings</h1>
          <Link 
            href="/stories" 
            className="bg-islamic-primary text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition flex items-center"
          >
            <Mic size={18} className="mr-2" /> Record New
          </Link>
        </div>

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
            <p className="text-gray-500 mb-6">You haven't recorded any stories yet. Why not try one now?</p>
            <Link 
              href="/stories" 
              className="inline-block bg-islamic-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Go to Story Zone
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((rec) => (
              (() => {
                const submittedAt = rec.submitted_at || rec.created_at || new Date().toISOString();
                const durationSeconds = rec.duration ?? rec.duration_seconds ?? 0;
                return (
              <div key={rec.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {rec.story?.title || rec.title || 'Studio Recording'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center"><Calendar size={14} className="mr-1" /> {formatDate(submittedAt)}</span>
                    <span className="flex items-center"><Clock size={14} className="mr-1" /> {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {rec.status === 'approved' && (
                     <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg font-bold border border-yellow-100">
                       ⭐ {rec.points_awarded || 0} pts
                     </div>
                  )}
                  
                  <span className={`px-4 py-2 rounded-full text-sm font-bold capitalize ${getStatusColor(rec.status)}`}>
                    {rec.status}
                  </span>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
