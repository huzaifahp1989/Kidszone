'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Story, Recording } from '@/types/stories';
import { ArrowLeft, Play, Pause, Square, Mic, Volume2, User } from 'lucide-react';
import { Button } from '@/components';

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Unwrap params safely (handles both Promise and object)
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) {
      fetchStory(id);
    }
    
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      // Cleanup speech on unmount
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [id]);

  const fetchStory = async (storyId: string) => {
    try {
      // Fetch story
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (storyError) throw storyError;
      setStory(storyData);

      // Fetch approved recordings (order by submitted_at, fallback to created_at)
      const runQuery = async (orderColumn: 'submitted_at' | 'created_at') => {
        return await supabase
          .from('recordings')
          .select('*')
          .eq('story_id', storyId)
          .eq('status', 'approved')
          .order(orderColumn, { ascending: false });
      };
      let { data: recordingsData, error: recordingsError } = await runQuery('submitted_at');
      if (recordingsError && recordingsError.message?.includes('submitted_at')) {
        ({ data: recordingsData, error: recordingsError } = await runQuery('created_at'));
      }
      if (!recordingsError && recordingsData) setRecordings(recordingsData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!story || !synthRef.current) return;

    if (isPaused) {
      synthRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
      return;
    }

    // Start new utterance
    const textToRead = `${story.title}. ${story.content}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utteranceRef.current = utterance;

    // Configure voice (try to find a good English voice)
    const voices = synthRef.current.getVoices();
    // Prefer a female voice for kids stories if available, or just the default
    const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.1; // Slightly higher pitch

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-islamic-light flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-primary"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-islamic-light flex flex-col justify-center items-center p-4">
        <p className="text-xl text-gray-600 mb-4">Story not found</p>
        <Link href="/stories">
          <Button>Back to Stories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-islamic-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/stories" 
          className="inline-flex items-center text-gray-600 hover:text-islamic-primary mb-6 transition"
        >
          <ArrowLeft size={20} className="mr-2" /> Back to Library
        </Link>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-indigo-50">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{story.title}</h1>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                Age: {story.age_min}-{story.age_max} years
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                Authentic Story
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlay}
                className={`rounded-full w-12 h-12 flex items-center justify-center transition-all shadow-md hover:shadow-lg transform active:scale-95 ${
                  isPlaying 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                title={isPlaying ? "Pause" : "Listen to Story"}
              >
                {isPlaying ? <Pause className="fill-white text-white" /> : <Play className="fill-white text-white ml-1" />}
              </button>
              
              {(isPlaying || isPaused) && (
                <button
                  onClick={handleStop}
                  className="rounded-full w-12 h-12 flex items-center justify-center border-2 border-slate-300 hover:bg-slate-200 transition-all shadow-sm active:scale-95 bg-white"
                  title="Stop"
                >
                  <Square className="fill-slate-500 text-slate-500" size={16} />
                </button>
              )}
              
              <span className="text-sm font-medium text-indigo-900 ml-2 hidden sm:inline-block">
                {isPlaying ? 'Listening...' : 'Listen to Story'}
              </span>
            </div>

            <Link href={`/stories/${story.id}/record`}>
              <Button 
                variant="danger"
                className="bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <Mic className="mr-2 h-4 w-4" />
                Record Your Version
              </Button>
            </Link>
          </div>

          {/* Story Content */}
          <div className="p-8 md:p-12">
            <div className="prose prose-lg prose-indigo max-w-none">
              <div className="text-xl leading-relaxed text-slate-700 font-serif whitespace-pre-line">
                {story.content}
              </div>
            </div>
          </div>
          
          {/* Community Recordings Section */}
          {recordings.length > 0 && (
            <div className="bg-slate-50 p-8 border-t border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                <Mic className="mr-2 text-indigo-500" /> Community Recordings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordings.map((rec) => (
                  <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <User size={16} />
                        </div>
                        <span className="font-semibold text-slate-700">Kid Reciter</span>
                      </div>
                      {(() => {
                        const seconds = rec.duration ?? rec.duration_seconds ?? 0;
                        return (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                          </span>
                        );
                      })()}
                    </div>
                    <audio 
                      controls 
                      src={supabase.storage.from('story-recordings').getPublicUrl(rec.audio_path).data.publicUrl} 
                      className="w-full h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
