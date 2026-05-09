'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Story, Recording } from '@/types/stories';
import { storyQuizzesByTitle, StoryQuizOptionKey } from '@/data/story-quizzes';
import { useAuth } from '@/lib/auth-context';
import { addPoints } from '@/lib/profile-service';
import { ArrowLeft, Play, Pause, Square, Mic, BookOpen, Star, ExternalLink, CheckCircle, Headphones } from 'lucide-react';

const RECORD_APP_URL = 'https://create-me-a-audio.vercel.app/kids-record';
const POINTS_PER_RECORDING = 30;

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'read' | 'record' | 'quiz'>('read');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, StoryQuizOptionKey | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [recordingSubmitted, setRecordingSubmitted] = useState(false);
  const [submittingRecording, setSubmittingRecording] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const searchParams = useSearchParams();

  const storyQuiz = story ? storyQuizzesByTitle[story.title] : undefined;

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    // Check if we should open the record tab
    const tab = searchParams.get('tab');
    if (tab === 'record') setActiveTab('record');
  }, [searchParams]);

  useEffect(() => {
    if (id) fetchStory(id);
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => { if (synthRef.current) synthRef.current.cancel(); };
  }, [id]);

  useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
  }, [story?.title]);

  const fetchStory = async (storyId: string) => {
    try {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (storyError) throw storyError;
      setStory(storyData);

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
    if (isPaused) { synthRef.current.resume(); setIsPlaying(true); setIsPaused(false); return; }
    if (isPlaying) { synthRef.current.pause(); setIsPlaying(false); setIsPaused(true); return; }
    const textToRead = `${story.title}. ${story.content}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utteranceRef.current = utterance;
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
    synthRef.current.speak(utterance);
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (synthRef.current) { synthRef.current.cancel(); setIsPlaying(false); setIsPaused(false); }
  };

  const handleRecordComplete = async () => {
    if (!user || !story) return;
    setSubmittingRecording(true);
    try {
      // Award 30 points for recording
      await addPoints(user.id, POINTS_PER_RECORDING);

      // Log the recording in the database
      await supabase.from('recordings').insert({
        user_id: user.id,
        story_id: story.id,
        audio_path: `external/${user.id}/${Date.now()}`,
        duration: 0,
        status: 'approved',
      });

      setRecordingSubmitted(true);
    } catch (err) {
      console.error('Error awarding points:', err);
      setRecordingSubmitted(true); // Still show success to not frustrate kids
    } finally {
      setSubmittingRecording(false);
    }
  };

  const quizScore = storyQuiz && quizSubmitted
    ? storyQuiz.quiz.reduce((acc, q, idx) => acc + (selectedAnswers[idx] === q.correct_answer ? 1 : 0), 0) * storyQuiz.points_per_question
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf8f3] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14b8a6]"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#fdf8f3] flex flex-col justify-center items-center p-4">
        <p className="text-xl text-[#6a422d] mb-4">Story not found</p>
        <Link href="/stories" className="px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl">
          Back to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/stories" className="inline-flex items-center text-[#a1633a] hover:text-[#14b8a6] mb-6 font-semibold transition">
          <ArrowLeft size={20} className="mr-2" /> Back to Stories
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{story.title}</h1>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                📖 Authentic Story
              </span>
              {storyQuiz && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                  🧠 Quiz Included
                </span>
              )}
              <span className="bg-[#fbbf24] text-[#92400e] px-3 py-1 rounded-full text-sm font-bold">
                🎤 +{POINTS_PER_RECORDING} pts for recording
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e5c9a3]/30">
            <button
              onClick={() => setActiveTab('read')}
              className={`flex-1 py-4 px-6 font-bold text-sm flex items-center justify-center gap-2 transition ${
                activeTab === 'read'
                  ? 'text-[#6366f1] border-b-3 border-[#6366f1] bg-[#eef2ff]/50'
                  : 'text-[#a1633a] hover:bg-[#f9f0e6]'
              }`}
            >
              <BookOpen size={18} /> Read & Listen
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 py-4 px-6 font-bold text-sm flex items-center justify-center gap-2 transition ${
                activeTab === 'record'
                  ? 'text-[#ff4757] border-b-3 border-[#ff4757] bg-[#fff5f5]/50'
                  : 'text-[#a1633a] hover:bg-[#f9f0e6]'
              }`}
            >
              <Mic size={18} /> Record & Earn Points
            </button>
            {storyQuiz && (
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 py-4 px-6 font-bold text-sm flex items-center justify-center gap-2 transition ${
                  activeTab === 'quiz'
                    ? 'text-[#14b8a6] border-b-3 border-[#14b8a6] bg-[#f0fdfa]/50'
                    : 'text-[#a1633a] hover:bg-[#f9f0e6]'
                }`}
              >
                🧠 Quiz
              </button>
            )}
          </div>

          {/* Read & Listen Tab */}
          {activeTab === 'read' && (
            <div className="p-8 md:p-12">
              {/* Audio Controls */}
              <div className="flex items-center gap-3 mb-8 p-4 bg-[#eef2ff] rounded-xl border border-[#8b5cf6]/10">
                <button onClick={handlePlay} className={`rounded-full w-12 h-12 flex items-center justify-center transition-all shadow-md ${
                  isPlaying ? 'bg-[#fbbf24] hover:bg-[#f59e0b]' : 'bg-[#6366f1] hover:bg-[#4338ca]'
                }`}>
                  {isPlaying ? <Pause className="fill-white text-white" size={20} /> : <Play className="fill-white text-white ml-1" size={20} />}
                </button>
                {(isPlaying || isPaused) && (
                  <button onClick={handleStop} className="rounded-full w-12 h-12 flex items-center justify-center bg-white border-2 border-[#e5c9a3]/30 hover:bg-[#f9f0e6] transition shadow-sm">
                    <Square className="fill-[#6a422d] text-[#6a422d]" size={14} />
                  </button>
                )}
                <span className="text-sm font-semibold text-[#6366f1]">
                  {isPlaying ? 'Listening...' : isPaused ? 'Paused' : 'Listen to Story'}
                </span>
              </div>

              {/* Story Content */}
              <div className="text-xl leading-relaxed text-[#6a422d] whitespace-pre-line font-serif">
                {story.content}
              </div>
            </div>
          )}

          {/* Record Tab */}
          {activeTab === 'record' && (
            <div className="p-8 md:p-12">
              {!recordingSubmitted ? (
                <div className="space-y-8">
                  {/* Points banner */}
                  <div className="bg-gradient-to-r from-[#fbbf24]/20 via-[#fbbf24]/10 to-[#fbbf24]/20 rounded-2xl border border-[#fbbf24]/30 p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Star size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#6a422d] mb-2">Record & Earn {POINTS_PER_RECORDING} Points!</h3>
                    <p className="text-[#a1633a]">Read this story aloud, record it, and earn points for your effort!</p>
                  </div>

                  {/* Story Preview */}
                  <div className="bg-[#f9f0e6] rounded-xl p-6 border border-[#e5c9a3]/30">
                    <h4 className="font-bold text-[#6a422d] mb-3">Your story to read:</h4>
                    <p className="text-[#6a422d] text-sm leading-relaxed line-clamp-6">{story.content}</p>
                  </div>

                  {/* Tips */}
                  <div className="bg-[#f0fdfa] rounded-xl p-5 border border-[#14b8a6]/20">
                    <h4 className="font-bold text-[#0d9488] mb-3">Recording Tips</h4>
                    <ul className="space-y-2 text-sm text-[#115e59]">
                      <li className="flex items-start gap-2"><span className="text-[#14b8a6]">✓</span> Find a quiet place</li>
                      <li className="flex items-start gap-2"><span className="text-[#14b8a6]">✓</span> Speak clearly and slowly</li>
                      <li className="flex items-start gap-2"><span className="text-[#14b8a6]">✓</span> No background music please</li>
                      <li className="flex items-start gap-2"><span className="text-[#14b8a6]">✓</span> Record for at least 30 seconds</li>
                    </ul>
                  </div>

                  {/* Record Button - links to external app */}
                  {!user ? (
                    <div className="text-center p-6 bg-[#fff5f5] rounded-xl border border-[#ff6b6b]/20">
                      <p className="text-[#ff4757] font-semibold mb-3">Please sign in to record and earn points</p>
                      <Link href="/signin?next=/stories" className="inline-block px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-md">
                        Sign In
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <a
                        href={RECORD_APP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#ff6b6b] to-[#ff4757] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                      >
                        <Mic size={24} /> Open Recorder <ExternalLink size={18} />
                      </a>
                      <p className="text-sm text-[#a1633a]">Opens in a new tab. Come back after recording!</p>

                      <button
                        onClick={handleRecordComplete}
                        disabled={submittingRecording}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {submittingRecording ? 'Awarding points...' : <><CheckCircle size={24} /> I've Recorded! Claim {POINTS_PER_RECORDING} Points</>}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <Star size={48} className="text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-[#6a422d]">MashaAllah!</h3>
                  <p className="text-xl text-[#a1633a]">You earned {POINTS_PER_RECORDING} points for recording!</p>
                  <p className="text-[#6a422d]">JazakAllah Khair for reading this beautiful story. Keep up the great work!</p>
                  <div className="flex justify-center gap-4">
                    <Link href="/stories" className="px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold rounded-xl shadow-md">
                      Read More Stories
                    </Link>
                    <Link href="/leaderboard" className="px-6 py-3 bg-white text-[#6a422d] font-bold rounded-xl border border-[#e5c9a3]/30 hover:bg-[#f9f0e6]">
                      View Leaderboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && storyQuiz && (
            <div className="p-8 md:p-12 border-t border-[#e5c9a3]/30">
              <div className="flex flex-col gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-[#6a422d]">Story Quiz</h2>
                <div className="text-[#a1633a]">
                  <div className="font-semibold text-[#14b8a6]">{storyQuiz.engagement_message}</div>
                  <div className="text-sm">
                    {storyQuiz.points_per_question} points per question - Total {storyQuiz.total_points} points
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {storyQuiz.quiz.map((q, idx) => {
                  const selected = selectedAnswers[idx] ?? null;
                  const correct = q.correct_answer;
                  const optionKeys: StoryQuizOptionKey[] = ['A', 'B', 'C', 'D'];
                  return (
                    <div key={idx} className="bg-[#f9f0e6] rounded-xl p-6 border border-[#e5c9a3]/30">
                      <div className="font-bold text-[#6a422d] mb-4">{idx + 1}. {q.question}</div>
                      <div className="grid gap-3">
                        {optionKeys.map((k) => {
                          const isSelected = selected === k;
                          const isCorrect = correct === k;
                          const showCorrectness = quizSubmitted;
                          const base = 'w-full text-left px-4 py-3 rounded-xl border-2 transition-all';
                          const classes = showCorrectness
                            ? isCorrect ? `${base} bg-[#f0fdfa] border-[#14b8a6] text-[#0d9488]`
                              : isSelected ? `${base} bg-[#fff5f5] border-[#ff6b6b] text-[#ff4757]`
                              : `${base} bg-white border-[#e5c9a3]/30 text-[#6a422d]`
                            : isSelected ? `${base} bg-[#eef2ff] border-[#8b5cf6] text-[#4338ca]`
                            : `${base} bg-white border-[#e5c9a3]/30 text-[#6a422d] hover:bg-[#f9f0e6]`;
                          return (
                            <button key={k} type="button" className={classes}
                              onClick={() => { if (!quizSubmitted) setSelectedAnswers((prev) => ({ ...prev, [idx]: k })); }}>
                              <span className="font-bold mr-2">{k}.</span> {q.options[k]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="text-[#6a422d] font-semibold">
                  {quizSubmitted ? `Score: ${quizScore} / ${storyQuiz.total_points}` : `Answer all questions to earn ${storyQuiz.total_points} points.`}
                </div>
                <div className="flex gap-2">
                  {!quizSubmitted ? (
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(selectedAnswers).length < storyQuiz.quiz.length}
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      className="px-6 py-3 bg-white text-[#6a422d] font-bold rounded-xl border border-[#e5c9a3]/30 hover:bg-[#f9f0e6]"
                      onClick={() => { setSelectedAnswers({}); setQuizSubmitted(false); }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Community Recordings */}
          {recordings.length > 0 && (
            <div className="bg-[#f9f0e6] p-8 border-t border-[#e5c9a3]/30">
              <h3 className="text-2xl font-bold text-[#6a422d] mb-6 flex items-center gap-2">
                <Headphones size={24} className="text-[#8b5cf6]" /> Community Recordings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordings.map((rec) => (
                  <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#e5c9a3]/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-[#6a422d]">Kid Reciter</span>
                      {(() => {
                        const seconds = rec.duration ?? rec.duration_seconds ?? 0;
                        return (
                          <span className="text-xs text-[#a1633a] bg-[#f9f0e6] px-2 py-1 rounded-full">
                            {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                          </span>
                        );
                      })()}
                    </div>
                    <audio controls src={supabase.storage.from('story-recordings').getPublicUrl(rec.audio_path).data.publicUrl} className="w-full h-8" />
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
