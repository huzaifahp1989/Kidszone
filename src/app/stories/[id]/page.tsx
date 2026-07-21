'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Story, Recording } from '@/types/stories';
import { getStoryQuizForTitle, StoryQuizOptionKey } from '@/data/story-quizzes';
import { useAuth } from '@/lib/auth-context';
import { useAgeMode } from '@/lib/age-mode';
import { usePointsProgress } from '@/lib/points-progress-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { trackPodcastPlayed } from '@/lib/analytics';
import { ArrowLeft, Play, Pause, Square, Mic, BookOpen, Star, ExternalLink, CheckCircle, Headphones } from 'lucide-react';

const RECORD_APP_URL = 'https://create-me-a-audio.vercel.app/kids-record';
const POINTS_PER_RECORDING = 30;

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const { isYounger } = useAgeMode();
  const { showPointsProgress } = usePointsProgress();
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
  const [awardingQuiz, setAwardingQuiz] = useState(false);
  const [quizAwardMessage, setQuizAwardMessage] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const searchParams = useSearchParams();

  const storyQuiz = useMemo(
    () => getStoryQuizForTitle(story?.title, isYounger ? 'younger' : 'older'),
    [story?.title, isYounger]
  );

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'record') setActiveTab('record');
    if (tab === 'quiz') setActiveTab('quiz');
  }, [searchParams]);

  useEffect(() => {
    if (id) fetchStory(id);
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [id]);

  useEffect(() => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizAwardMessage(null);
  }, [story?.title, isYounger]);

  const fetchStory = async (storyId: string) => {
    try {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      if (storyError) throw storyError;
      setStory(storyData);

      const recordingsRes = await fetch(`/api/stories/${storyId}/recordings`, { cache: 'no-store' });
      if (!recordingsRes.ok) {
        throw new Error('Failed to load story recordings');
      }

      const recordingsPayload = await recordingsRes.json();
      setRecordings(recordingsPayload.recordings || []);
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
    const textToRead = `${story.title}. ${story.content}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utteranceRef.current = utterance;
    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Female') || v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
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

  const handleRecordComplete = async () => {
    if (!user || !story) return;
    setSubmittingRecording(true);
    try {
      const res = await fetch('/api/stories/record-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storyId: story.id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Could not save story recording');
      }

      setRecordingSubmitted(true);
    } catch (err) {
      console.error('Error awarding points:', err);
    } finally {
      setSubmittingRecording(false);
    }
  };

  const correctCount = storyQuiz
    ? storyQuiz.quiz.reduce(
        (acc, q, idx) => acc + (selectedAnswers[idx] === q.correct_answer ? 1 : 0),
        0
      )
    : 0;

  const submitStoryQuiz = async () => {
    const score = storyQuiz.quiz.reduce(
      (acc, q, idx) => acc + (selectedAnswers[idx] === q.correct_answer ? 1 : 0),
      0
    );
    setQuizSubmitted(true);
    if (!user?.id) {
      setQuizAwardMessage('Sign in to earn +25 points for story quizzes.');
      return;
    }
    if (score < 2) {
      setQuizAwardMessage('Get at least 2 correct to earn today’s story quiz points. Try again!');
      return;
    }

    setAwardingQuiz(true);
    try {
      const res = await authJsonFetch('/api/activities/complete', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, activity: 'story_quiz' }),
      });
      const data = await res.json().catch(() => ({}));
      const awarded = Number(data?.pointsAwarded ?? 0);
      setQuizAwardMessage(
        awarded > 0
          ? data?.message || `+${awarded} points for your story quiz!`
          : data?.message || 'Story quiz complete. Come back tomorrow for more points.'
      );
      if (data?.profile) {
        updateLocalProfile({
          points: data.profile.points,
          weeklyPoints: data.profile.weeklyPoints,
          monthlyPoints: data.profile.monthlyPoints,
          todayPoints: data.profile.todayPoints,
        });
      }
      if (awarded > 0) {
        showPointsProgress?.({
          activity: 'other',
          activityLabel: 'Story Mini-Quiz',
          pointsEarned: awarded,
        });
        await refreshProfile();
      }
    } catch {
      setQuizAwardMessage('Could not save points. Please try again.');
    } finally {
      setAwardingQuiz(false);
    }
  };

  const featuredRecording = recordings.find((recording) => recording.audio_url);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7c3aed]"></div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex flex-col justify-center items-center p-4">
        <p className="text-xl text-[#1e1b4b] mb-4">Story not found</p>
        <Link href="/stories" className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold rounded-xl">
          Back to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/stories" className="inline-flex items-center text-[#475569] hover:text-[#7c3aed] mb-6 font-semibold transition">
          <ArrowLeft size={20} className="mr-2" /> Back to Stories
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-[#c4b5fd]/30 overflow-hidden">
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] p-8 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{story.title}</h1>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                📖 Authentic Story
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                🧠 Mini-quiz · +{ACTIVITY_BONUS_POINTS} pts/day
              </span>
              <span className="bg-[#fbbf24] text-[#92400e] px-3 py-1 rounded-full text-sm font-bold">
                🎤 +{POINTS_PER_RECORDING} pts for recording
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 border-b border-[#c4b5fd]/30">
            <button
              onClick={() => setActiveTab('read')}
              className={`py-3 px-2 sm:py-4 sm:px-4 font-bold text-[11px] sm:text-sm leading-tight flex items-center justify-center gap-1 sm:gap-2 transition ${
                activeTab === 'read'
                  ? 'text-[#6366f1] border-b-3 border-[#6366f1] bg-[#eef2ff]/50'
                  : 'text-[#475569] hover:bg-[#ede9fe]'
              }`}
            >
              <BookOpen size={16} />
              <span className="sm:hidden">Read</span>
              <span className="hidden sm:inline">Read &amp; Listen</span>
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`py-3 px-2 sm:py-4 sm:px-4 font-bold text-[11px] sm:text-sm leading-tight flex items-center justify-center gap-1 sm:gap-2 transition ${
                activeTab === 'record'
                  ? 'text-[#ff4757] border-b-3 border-[#ff4757] bg-[#fff5f5]/50'
                  : 'text-[#475569] hover:bg-[#ede9fe]'
              }`}
            >
              <Mic size={16} />
              <span className="sm:hidden">Record</span>
              <span className="hidden sm:inline">Record &amp; Earn Points</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`py-3 px-2 sm:py-4 sm:px-4 font-bold text-[11px] sm:text-sm leading-tight flex items-center justify-center gap-1 sm:gap-2 transition ${
                activeTab === 'quiz'
                  ? 'text-[#7c3aed] border-b-3 border-[#7c3aed] bg-[#f5f3ff]/50'
                  : 'text-[#475569] hover:bg-[#ede9fe]'
              }`}
            >
              <span>🧠</span>
              <span>Quiz</span>
            </button>
          </div>

          {activeTab === 'read' && (
            <div className="p-8 md:p-12">
              {featuredRecording && (
                <div className="mb-8 rounded-2xl border border-[#7c3aed]/20 bg-gradient-to-r from-[#f5f3ff] to-[#eef2ff] p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Audiobook</div>
                      <h3 className="text-xl font-bold text-[#1e1b4b]">Listen to this story</h3>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#475569] shadow-sm">
                      {featuredRecording.child_name?.trim() || 'Community narration'}
                    </div>
                  </div>
                  <audio
                    controls
                    preload="none"
                    src={featuredRecording.audio_url}
                    className="w-full"
                    onPlay={() => trackPodcastPlayed({ source: 'story_audiobook', storyId: story.id })}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-8 p-4 bg-[#eef2ff] rounded-xl border border-[#8b5cf6]/10">
                <button
                  onClick={handlePlay}
                  className={`rounded-full w-12 h-12 flex items-center justify-center transition-all shadow-md ${
                    isPlaying ? 'bg-[#fbbf24] hover:bg-[#f59e0b]' : 'bg-[#6366f1] hover:bg-[#4338ca]'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="fill-white text-white" size={20} />
                  ) : (
                    <Play className="fill-white text-white ml-1" size={20} />
                  )}
                </button>
                {(isPlaying || isPaused) && (
                  <button
                    onClick={handleStop}
                    className="rounded-full w-12 h-12 flex items-center justify-center bg-white border-2 border-[#c4b5fd]/30 hover:bg-[#ede9fe] transition shadow-sm"
                  >
                    <Square className="fill-[#1e1b4b] text-[#1e1b4b]" size={14} />
                  </button>
                )}
                <span className="text-sm font-semibold text-[#6366f1]">
                  {isPlaying
                    ? 'Listening...'
                    : isPaused
                      ? 'Paused'
                      : featuredRecording
                        ? 'Use browser voice instead'
                        : 'Listen to Story'}
                </span>
              </div>

              <div className="text-xl leading-relaxed text-[#1e1b4b] whitespace-pre-line font-serif">
                {story.content}
              </div>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-6 py-3 font-bold text-white shadow-md"
                >
                  Take the mini-quiz (+{ACTIVITY_BONUS_POINTS} pts)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'record' && (
            <div className="p-8 md:p-12">
              {!recordingSubmitted ? (
                <div className="space-y-8">
                  <div className="bg-gradient-to-r from-[#fbbf24]/20 via-[#fbbf24]/10 to-[#fbbf24]/20 rounded-2xl border border-[#fbbf24]/30 p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Star size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#1e1b4b] mb-2">
                      Record & Earn {POINTS_PER_RECORDING} Points!
                    </h3>
                    <p className="text-[#475569]">
                      Read this story aloud, record it, and earn points for your effort!
                    </p>
                  </div>

                  <div className="bg-[#ede9fe] rounded-xl p-6 border border-[#c4b5fd]/30">
                    <h4 className="font-bold text-[#1e1b4b] mb-3">Your story to read:</h4>
                    <p className="text-[#1e1b4b] text-sm leading-relaxed line-clamp-6">{story.content}</p>
                  </div>

                  <div className="bg-[#f5f3ff] rounded-xl p-5 border border-[#7c3aed]/20">
                    <h4 className="font-bold text-[#6d28d9] mb-3">Recording Tips</h4>
                    <ul className="space-y-2 text-sm text-[#5b21b6]">
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c3aed]">✓</span> Find a quiet place
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c3aed]">✓</span> Speak clearly and slowly
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c3aed]">✓</span> No background music please
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7c3aed]">✓</span> Record for at least 30 seconds
                      </li>
                    </ul>
                  </div>

                  {!user ? (
                    <div className="text-center p-6 bg-[#fff5f5] rounded-xl border border-[#ff6b6b]/20">
                      <p className="text-[#ff4757] font-semibold mb-3">Please sign in to record and earn points</p>
                      <Link
                        href="/signin?next=/stories"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold rounded-xl shadow-md"
                      >
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
                      <p className="text-sm text-[#475569]">Opens in a new tab. Come back after recording!</p>

                      <button
                        onClick={handleRecordComplete}
                        disabled={submittingRecording}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {submittingRecording ? (
                          'Awarding points...'
                        ) : (
                          <>
                            <CheckCircle size={24} /> I&apos;ve Recorded! Claim {POINTS_PER_RECORDING} Points
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <Star size={48} className="text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-[#1e1b4b]">MashaAllah!</h3>
                  <p className="text-xl text-[#475569]">You earned {POINTS_PER_RECORDING} points for recording!</p>
                  <p className="text-[#1e1b4b]">
                    JazakAllah Khair for reading this beautiful story. Keep up the great work!
                  </p>
                  <div className="flex justify-center gap-4">
                    <Link
                      href="/stories"
                      className="px-6 py-3 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold rounded-xl shadow-md"
                    >
                      Read More Stories
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="px-6 py-3 bg-white text-[#1e1b4b] font-bold rounded-xl border border-[#c4b5fd]/30 hover:bg-[#ede9fe]"
                    >
                      View Leaderboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="p-8 md:p-12 border-t border-[#c4b5fd]/30">
              <div className="flex flex-col gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-[#1e1b4b]">Story Mini-Quiz</h2>
                <div className="text-[#475569]">
                  <div className="font-semibold text-[#7c3aed]">{storyQuiz.engagement_message}</div>
                  <div className="text-sm">
                    {isYounger
                      ? `3 easy questions · +${ACTIVITY_BONUS_POINTS} once per day`
                      : `3 reflection questions · +${ACTIVITY_BONUS_POINTS} once per day`}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {storyQuiz.quiz.map((q, idx) => {
                  const selected = selectedAnswers[idx] ?? null;
                  const correct = q.correct_answer;
                  const optionKeys: StoryQuizOptionKey[] = ['A', 'B', 'C', 'D'];
                  return (
                    <div key={idx} className="bg-[#ede9fe] rounded-xl p-6 border border-[#c4b5fd]/30">
                      <div className="font-bold text-[#1e1b4b] mb-4">
                        {idx + 1}. {q.question}
                      </div>
                      <div className="grid gap-3">
                        {optionKeys.map((k) => {
                          const isSelected = selected === k;
                          const isCorrect = correct === k;
                          const showCorrectness = quizSubmitted;
                          const base = 'w-full text-left px-4 py-3 rounded-xl border-2 transition-all';
                          const classes = showCorrectness
                            ? isCorrect
                              ? `${base} bg-[#f5f3ff] border-[#7c3aed] text-[#6d28d9]`
                              : isSelected
                                ? `${base} bg-[#fff5f5] border-[#ff6b6b] text-[#ff4757]`
                                : `${base} bg-white border-[#c4b5fd]/30 text-[#1e1b4b]`
                            : isSelected
                              ? `${base} bg-[#eef2ff] border-[#8b5cf6] text-[#4338ca]`
                              : `${base} bg-white border-[#c4b5fd]/30 text-[#1e1b4b] hover:bg-[#ede9fe]`;
                          return (
                            <button
                              key={k}
                              type="button"
                              className={classes}
                              onClick={() => {
                                if (!quizSubmitted) setSelectedAnswers((prev) => ({ ...prev, [idx]: k }));
                              }}
                            >
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
                <div className="text-[#1e1b4b] font-semibold">
                  {quizSubmitted
                    ? `Score: ${correctCount} / ${storyQuiz.quiz.length}`
                    : `Answer all ${storyQuiz.quiz.length} questions.`}
                  {quizAwardMessage && (
                    <p className="mt-1 text-sm font-semibold text-violet-700">{quizAwardMessage}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!quizSubmitted ? (
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                      onClick={() => void submitStoryQuiz()}
                      disabled={
                        awardingQuiz || Object.keys(selectedAnswers).length < storyQuiz.quiz.length
                      }
                    >
                      {awardingQuiz ? 'Checking…' : 'Submit Quiz'}
                    </button>
                  ) : (
                    <button
                      className="px-6 py-3 bg-white text-[#1e1b4b] font-bold rounded-xl border border-[#c4b5fd]/30 hover:bg-[#ede9fe]"
                      onClick={() => {
                        setSelectedAnswers({});
                        setQuizSubmitted(false);
                        setQuizAwardMessage(null);
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {recordings.length > 0 && (
            <div className="bg-[#ede9fe] p-8 border-t border-[#c4b5fd]/30">
              <h3 className="text-2xl font-bold text-[#1e1b4b] mb-6 flex items-center gap-2">
                <Headphones size={24} className="text-[#8b5cf6]" /> Community Recordings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordings.map((rec) => (
                  <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#c4b5fd]/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-[#1e1b4b]">
                        {rec.child_name?.trim() || 'Kid Reciter'}
                      </span>
                      {(() => {
                        const seconds = rec.duration ?? rec.duration_seconds ?? 0;
                        return (
                          <span className="text-xs text-[#475569] bg-[#ede9fe] px-2 py-1 rounded-full">
                            {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                          </span>
                        );
                      })()}
                    </div>
                    {rec.audio_url && (
                      <audio
                        controls
                        preload="none"
                        src={rec.audio_url}
                        className="w-full h-8"
                        onPlay={() =>
                          trackPodcastPlayed({ source: 'story_community', storyId: story.id })
                        }
                      />
                    )}
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
