'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components';
import { CheckCircle, Calendar, Trophy, ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { quizzes } from '@/data/quizzes';
import { QUIZ_TOPICS, getTopicById, getTopicQuestionCount, getTopicQuizQuestions, getWeeklyTopicSeed, type QuizTopicId } from '@/lib/quiz-topics';

type QuizMode = 'daily' | null;

export default function QuizPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [mode, setMode] = useState<QuizMode>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [resultToast, setResultToast] = useState<string | null>(null);

  const [dailyQuiz, setDailyQuiz] = useState<any>(null);
  const [dailyStatus, setDailyStatus] = useState<'loading' | 'ready' | 'completed' | 'error'>('loading');
  const [dailyAnswers, setDailyAnswers] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [dailyResult, setDailyResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayDate, setTodayDate] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<QuizTopicId | null>(null);
  const [showRewardsPrompt, setShowRewardsPrompt] = useState(false);

  const [quizLockedUntil, setQuizLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [todaySeed, setTodaySeed] = useState<string>('');

  useEffect(() => {
    setTodayDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    setTodaySeed(getWeeklyTopicSeed());
  }, []);

  // Live countdown ticker — counts down to quizLockedUntil (epoch ms when lock expires)
  useEffect(() => {
    if (!quizLockedUntil) return;
    const tick = () => {
      const remaining = quizLockedUntil - Date.now();
      if (remaining <= 0) {
        setQuizLockedUntil(null);
        setCountdown('');
        setDailyStatus('ready');
        return;
      }
      const h = Math.floor(remaining / 3_600_000);
      const m = Math.floor((remaining % 3_600_000) / 60_000);
      const s = Math.floor((remaining % 60_000) / 1_000);
      setCountdown(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [quizLockedUntil]);

  useEffect(() => {
    async function fetchDailyStatus() {
      try {
        setDailyStatus('loading');
        const res = await fetch('/api/quiz/daily');
        if (!res.ok) {
          if (res.status === 404) {
            setDailyStatus('error');
            return;
          }
          throw new Error('Failed to fetch daily quiz');
        }
        const quizData = await res.json();
        setDailyQuiz(quizData);

        if (user?.id) {
          // Server-side 24-hour lock check — works across all devices
          const lockRes = await fetch(`/api/quiz/daily/lock-status?userId=${user.id}`);
          if (lockRes.ok) {
            const lockData = await lockRes.json();
            if (lockData.locked && lockData.lockedUntil) {
              setQuizLockedUntil(lockData.lockedUntil);
              setDailyStatus('completed');
              setDailyResult({ score: lockData.lastScore ?? 0 });
              return;
            }
          }
        }
        // Reset lock state if not locked
        setQuizLockedUntil(null);
        setDailyResult(null);
        setDailyStatus('ready');
      } catch (err) {
        console.error('Error fetching daily quiz:', err);
        setDailyStatus('error');
      }
    }
    fetchDailyStatus();
  }, [user]);

  const currentQuestions = useMemo(() => {
    if (mode === 'daily') {
      if (!selectedTopic || !todaySeed) return [];
      return getTopicQuizQuestions(quizzes as any[], selectedTopic, todaySeed, 5);
    }
    return [];
  }, [mode, selectedTopic, todaySeed]);

  const selectedTopicInfo = useMemo(() => getTopicById(selectedTopic), [selectedTopic]);

  const currentQuestion = currentQuestions[currentQuestionIndex];

  const startDailyQuiz = (topicId: QuizTopicId) => {
    if (!user?.id) {
      const msg = encodeURIComponent('Please sign in to take the daily quiz.');
      router.push(`/signin?next=%2Fquiz&message=${msg}`);
      return;
    }

    const topicQuestionCount = getTopicQuestionCount(quizzes as any[], topicId);
    if (topicQuestionCount === 0) {
      setResultToast(`No ${getTopicById(topicId)?.label || topicId} questions are available today.`);
      return;
    }

    setSelectedTopic(topicId);
    setMode('daily');
    setStartTime(Date.now());
    setCurrentQuestionIndex(0);
    setDailyAnswers({});
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowRewardsPrompt(false);
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    setDailyAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer
    }));

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!selectedTopic) {
      setResultToast('Please select a topic first.');
      return;
    }

    if (!currentQuestions.length) {
      setResultToast('No questions available for this topic right now. Please choose another topic.');
      setMode(null);
      return;
    }

    setQuizComplete(true);
    setIsSubmitting(true);
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    const finalAnswers: Record<string, number> = {
      ...dailyAnswers,
      [String(currentQuestion.id)]: Number(selectedAnswer)
    };

    try {
      if (!user?.id) {
        setResultToast('Please sign in to submit the quiz and earn points.');
        setMode(null);
        return;
      }

      const res = await fetch('/api/quiz/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          quizId: `topic-${selectedTopic}-${todaySeed}`,
          answers: finalAnswers,
          durationSeconds: duration,
          topic: selectedTopic,
          questionIds: currentQuestions.map((question: any) => String(question.id))
        })
      });

      const data = await res.json();
      
      // Handle 24-hour lock (429 status)
      if (res.status === 429 && data.locked) {
        setDailyStatus('completed');
        if (data.lockedUntil) {
          setQuizLockedUntil(data.lockedUntil);
        }
        setDailyResult({ score: data.lastScore ?? 0, awardedPoints: 0, message: data.error || 'Quiz already completed in the last 24 hours.' });
        setResultToast('You have finished both quizzes for today. Pledge Durood & Zikr to earn more bonus points!');
        return;
      }
      
      if (data.success) {
        const awardedPoints = Number(data.points ?? data.awardedPoints ?? 0);
        setDailyResult({ ...data, awardedPoints, message: data.message });
        const attemptsToday = Number(data.attemptsToday || 0);
        const maxDailyAttempts = Number(data.maxDailyAttempts || 2);
        const hasUsedAllDailyAttempts = attemptsToday >= maxDailyAttempts;
        setDailyStatus(hasUsedAllDailyAttempts ? 'completed' : 'ready');
        setShowRewardsPrompt(true);
        if (hasUsedAllDailyAttempts) {
          setQuizLockedUntil(Number(data.lockedUntil || Date.now() + 24 * 60 * 60 * 1000));
        } else {
          setQuizLockedUntil(null);
        }
        try {
          await refreshProfile();
        } catch {}
        if (awardedPoints > 0) {
          setResultToast(`+${awardedPoints} points added!`);
        } else if (data.message) {
          setResultToast(String(data.message));
        }
      } else {
        setResultToast(data.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setResultToast('Network error submitting quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPage = () => {
    setMode(null);
    setDailyResult(null);
    setQuizComplete(false);
    setResultToast(null);
    setShowRewardsPrompt(false);
    if (!quizLockedUntil) {
      setDailyStatus('ready');
    }
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setSelectedTopic(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#fdf8f3]">
        <div className="text-[#a1633a]">Loading...</div>
      </div>
    );
  }

  if (!mode) {
    return (
      <>
      <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0fdfa] rounded-full border border-[#14b8a6]/20">
              <Sparkles size={16} className="text-[#14b8a6]" />
              <span className="text-sm font-semibold text-[#0d9488]">Daily Challenge</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#6a422d]">
              Today's Quiz
            </h1>
            <p className="text-[#a1633a] text-lg">
              Test your Islamic knowledge and earn points!
            </p>
          </div>

          {/* Daily Quiz Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                    <Trophy size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Daily Competition Quiz</h2>
                    <div className="flex items-center gap-2 mt-1 text-white/80">
                      <Calendar size={16} />
                      <span>{todayDate}</span>
                    </div>
                  </div>
                </div>
                <span className="text-5xl">🏆</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              {dailyStatus === 'completed' && (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 font-semibold">
                    <CheckCircle size={18} />
                    Completed — Score: {dailyResult?.score ?? 0}
                  </div>
                  {countdown && (
                    <div className="flex items-center gap-2 text-[#a1633a] text-sm font-semibold">
                      <Clock size={15} className="text-[#cd9456]" />
                      Next quiz available in <span className="text-[#6a422d] font-bold ml-1">{countdown}</span>
                    </div>
                  )}
                  <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fbbf24]/30 text-left">
                    <p className="font-bold text-[#b45309] mb-1">Earn more points while you wait! 🌟</p>
                    <p className="text-[#92400e] text-sm mb-3">
                      You can take up to 2 quizzes each day for 50 points each. If you finish both, pledge Durood &amp; Zikr to keep earning bonus points until tomorrow.
                    </p>
                    <Link href="/pledge" className="inline-flex items-center gap-2 bg-[#fbbf24] text-[#92400e] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#f59e0b] transition-all">
                      📿 Pledge Durood &amp; Zikr →
                    </Link>
                  </div>
                </div>
              )}

              {dailyStatus === 'error' && (
                <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-200 font-semibold">
                  Quiz temporarily unavailable
                </div>
              )}

              {/* Description */}
              <div className="space-y-3 text-[#6a422d]">
                <p className="text-lg">
                  Choose up to two topics each day and complete them to earn 50 points each, for up to 100 quiz points daily.
                </p>
                <ul className="space-y-2 text-[#a1633a]">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                    5 Islamic questions in each topic
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#fbbf24]"></span>
                    Every completed topic gives a fixed +50 points
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff6b6b]"></span>
                    Compete with other learners
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span>
                    Topics: Quran, Hajj, Salah, Hadith, Seerah, Sahabah
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0ea5e9]"></span>
                    Questions refresh every Monday
                  </li>
                </ul>
              </div>

              {/* Topic Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {QUIZ_TOPICS.map((topic) => {
                  const topicCount = getTopicQuestionCount(quizzes as any[], topic.id);
                  const isReady = dailyStatus === 'ready' && user?.id && topicCount >= 5;

                  return (
                    <button
                      key={topic.id}
                      onClick={() => startDailyQuiz(topic.id)}
                      disabled={!isReady}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isReady
                          ? 'bg-white border-[#14b8a6]/30 hover:border-[#14b8a6] hover:shadow-md'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{topic.emoji}</span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#f0fdfa] text-[#0d9488]">
                          +50 pts
                        </span>
                      </div>
                      <p className="font-bold text-[#6a422d]">{topic.label}</p>
                      <p className="text-sm text-[#a1633a]">{Math.min(5, topicCount)} questions today</p>
                    </button>
                  );
                })}
              </div>

              {!user?.id && dailyStatus === 'ready' && (
                <Link
                  href="/signin?next=%2Fquiz"
                  className="block py-4 px-6 rounded-xl font-bold text-lg bg-white text-[#14b8a6] border-2 border-[#14b8a6] hover:bg-[#f0fdfa] transition-all text-center"
                >
                  Sign In to Start Topic Quiz
                </Link>
              )}

              {!user?.id && dailyStatus === 'ready' && (
                <p className="text-sm text-[#a1633a] text-center">
                  Sign in is required to take a topic quiz and earn points.
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Your Score', value: dailyResult?.score ?? '-', icon: '🎯' },
              { label: 'Topic', value: selectedTopicInfo?.label || '-', icon: '📚' },
              { label: 'Topic Reward', value: '+50', icon: '⭐' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 text-center border border-[#e5c9a3]/20 shadow-sm">
                <span className="text-2xl">{stat.icon}</span>
                <p className="text-2xl font-bold text-[#6a422d] mt-1">{stat.value}</p>
                <p className="text-sm text-[#a1633a]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="bg-[#fffbeb] rounded-xl p-5 border border-[#fbbf24]/30">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-bold text-[#b45309] mb-1">Quiz Tip</h4>
                <p className="text-[#92400e] text-sm">
                  Read each question carefully. Take your time - there's no rush! 
                  Remember, the goal is to learn, not just to score points.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Quiz Interface
  return (
    <>
    <div className="min-h-screen bg-[#fdf8f3] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={resetPage}
            className="flex items-center gap-2 text-[#6a422d] hover:text-[#14b8a6] font-semibold transition"
          >
            <ArrowLeft size={20} />
            Exit
          </button>
          <div className="text-sm font-semibold text-[#a1633a]">
            Question {currentQuestionIndex + 1} of {currentQuestions.length}
          </div>
        </div>

        {!quizComplete ? (
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 p-6 sm:p-8">
            {/* Progress Bar */}
            <div className="w-full bg-[#f9f0e6] h-3 rounded-full mb-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#14b8a6] to-[#fbbf24] h-full rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="mb-3">
              <span className="inline-flex items-center rounded-full bg-[#f0fdfa] text-[#0d9488] border border-[#14b8a6]/30 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                Topic: {selectedTopicInfo?.label || currentQuestion?.category || 'Islamic Knowledge'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#6a422d] mb-8 leading-relaxed">
              {currentQuestion?.question_text || currentQuestion?.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {(currentQuestion?.options || []).map((option: string, idx: number) => {
                const isSelected = selectedAnswer === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-4 sm:p-5 text-left rounded-xl border-2 transition-all text-base font-semibold ${
                      isSelected
                        ? 'border-[#14b8a6] bg-[#f0fdfa] text-[#0d9488]'
                        : 'border-[#e5c9a3]/50 bg-white text-[#6a422d] hover:border-[#14b8a6]/50 hover:bg-[#f9f0e6]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected
                            ? 'border-[#14b8a6] bg-[#14b8a6] text-white'
                            : 'border-[#e5c9a3] text-[#a1633a]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="pt-2">{option}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <div className="mt-8 pt-6 border-t border-[#e5c9a3]/30">
              <button
                onClick={handleNext}
                disabled={selectedAnswer === null}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  selectedAnswer !== null
                    ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {currentQuestionIndex === currentQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </button>
            </div>
          </div>
        ) : (
          // Quiz Complete View
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 p-8 text-center">
            {isSubmitting ? (
              <div className="py-12">
                <div className="animate-spin text-4xl mb-4">🔄</div>
                <p className="text-[#6a422d]">Submitting your answers...</p>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Trophy size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-[#6a422d] mb-2">Quiz Completed!</h2>
                <p className="text-[#a1633a] mb-6">MashaAllah! You finished the daily quiz.</p>

                <div className="space-y-4 mb-8">
                  <div className="bg-[#f0fdfa] rounded-xl p-4">
                    <p className="text-sm text-[#0d9488] font-semibold uppercase tracking-wide">Your Score</p>
                    <p className="text-4xl font-bold text-[#14b8a6]">{dailyResult?.score} / {currentQuestions.length}</p>
                  </div>

                  {dailyResult?.streak > 0 && (
                    <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-200 font-semibold">
                      🔥 {dailyResult.streak} Day Streak!
                    </div>
                  )}

                  {dailyResult?.awardedPoints > 0 ? (
                    <p className="text-[#14b8a6] font-bold text-lg">+{dailyResult.awardedPoints} Points Added to Leaderboard! ⭐</p>
                  ) : (
                    <p className="text-[#a1633a]">{dailyResult?.message || 'No points awarded for this attempt.'}</p>
                  )}

                  {/* Pledge CTA */}
                  <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fbbf24]/30 text-left">
                    <p className="font-bold text-[#b45309] mb-1">Want to earn more points? 🌟</p>
                    <p className="text-[#92400e] text-sm mb-2">
                      You can pledge Durood &amp; Zikr to earn extra bonus points after your quizzes. Come back tomorrow for two brand new quiz chances!
                    </p>
                    {countdown && (
                      <p className="flex items-center gap-1.5 text-xs text-[#a1633a] font-semibold mb-3">
                        <Clock size={13} /> Next quiz in <span className="text-[#6a422d] font-bold ml-1">{countdown}</span>
                      </p>
                    )}
                    <Link href="/pledge" className="inline-flex items-center gap-2 bg-[#fbbf24] text-[#92400e] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#f59e0b] transition-all">
                      📿 Pledge Durood &amp; Zikr →
                    </Link>
                  </div>
                </div>

                {resultToast && (
                  <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
                    {resultToast}
                  </div>
                )}

                <button
                  onClick={resetPage}
                  className="w-full py-4 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Return to Quiz Menu
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    <Modal
      isOpen={showRewardsPrompt}
      onClose={() => setShowRewardsPrompt(false)}
      title="Check Your Rewards"
    >
      <div className="space-y-4 text-center">
        <p className="text-[#6a422d] font-semibold">
          Great effort! Please check your Rewards page for important announcements and your weekly and monthly achievements.
        </p>
        <p className="text-sm text-[#a1633a]">
          Please also fill the winner contact form there so we can get to know your child better and contact you if your child wins.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowRewardsPrompt(false)}
            className="px-4 py-2 rounded-lg border border-[#e5c9a3]/40 text-[#6a422d] font-semibold hover:bg-[#f9f0e6]"
          >
            Close
          </button>
          <button
            onClick={() => {
              setShowRewardsPrompt(false);
              router.push('/rewards#winner-contact-form');
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold"
          >
            Open Rewards + Form
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
