'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, Modal } from '@/components';
import { CheckCircle, Calendar, Trophy, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type QuizMode = 'daily' | null;

export default function QuizPage() {
  const { user, profile, refreshProfile } = useAuth();
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

  useEffect(() => {
    setTodayDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

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
          const { data: attempt } = await supabase
            .from('quiz_attempts')
            .select('id, score')
            .eq('quiz_id', quizData.quizId)
            .eq('user_id', user.id)
            .single();
          if (attempt) {
            setDailyStatus('completed');
            setDailyResult({ score: attempt.score });
            return;
          }
        }
        setDailyStatus('ready');
      } catch (err) {
        console.error('Error fetching daily quiz:', err);
        setDailyStatus('error');
      }
    }
    fetchDailyStatus();
  }, [user?.id]);

  const currentQuestions = useMemo(() => {
    if (mode === 'daily') {
      return dailyQuiz?.questions || [];
    }
    return [];
  }, [mode, dailyQuiz]);

  const currentQuestion = currentQuestions[currentQuestionIndex];

  const startDailyQuiz = () => {
    setMode('daily');
    setStartTime(Date.now());
    setCurrentQuestionIndex(0);
    setDailyAnswers({});
    setQuizComplete(false);
    setSelectedAnswer(null);
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
        const questions = (dailyQuiz?.questions || []) as any[];
        let computed = 0;
        for (const q of questions) {
          const a = finalAnswers[String(q.id)];
          if (typeof a === 'number' && a === q.correctAnswer) computed += 1;
        }
        setDailyResult({ score: computed, pointsAwarded: 0, guest: true });
        setDailyStatus('completed');
        setResultToast('Sign in to enter competitions and earn points.');
        return;
      }

      const res = await fetch('/api/quiz/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          quizId: dailyQuiz.quizId,
          answers: finalAnswers,
          durationSeconds: duration
        })
      });

      const data = await res.json();
      if (data.success) {
        setDailyResult(data);
        setDailyStatus('completed');
        refreshProfile();
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
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#fdf8f3]">
        <div className="text-[#a1633a]">Loading...</div>
      </div>
    );
  }

  if (!mode) {
    const dailyCtaLabel =
      dailyStatus === 'loading'
        ? 'Loading...'
        : dailyStatus === 'completed'
          ? 'Completed Today'
          : dailyStatus === 'error'
            ? 'Unavailable'
            : user?.id
              ? 'Start Daily Quiz'
              : 'Sign in to Play';

    return (
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
                <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 font-semibold">
                  <CheckCircle size={18} />
                  Completed - Score: {dailyResult?.score ?? 0}
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
                  Answer all questions correctly to earn bonus points and climb the leaderboard!
                </p>
                <ul className="space-y-2 text-[#a1633a]">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                    5 Islamic knowledge questions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#fbbf24]"></span>
                    Earn points for correct answers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff6b6b]"></span>
                    Compete with other learners
                  </li>
                </ul>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startDailyQuiz}
                  disabled={dailyStatus !== 'ready'}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                    dailyStatus === 'ready'
                      ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                      : dailyStatus === 'completed'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {dailyCtaLabel}
                </button>

                {!user?.id && dailyStatus === 'ready' && (
                  <Link
                    href="/signin?next=%2Fquiz"
                    className="py-4 px-6 rounded-xl font-bold text-lg bg-white text-[#14b8a6] border-2 border-[#14b8a6] hover:bg-[#f0fdfa] transition-all text-center"
                  >
                    Sign In to Earn Points
                  </Link>
                )}
              </div>

              {!user?.id && dailyStatus === 'ready' && (
                <p className="text-sm text-[#a1633a] text-center">
                  You can take the quiz as a guest, but sign in to save your progress and compete!
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Your Score', value: dailyResult?.score ?? '-', icon: '🎯' },
              { label: 'Questions', value: '5', icon: '❓' },
              { label: 'Time Limit', value: 'None', icon: '⏱️' },
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
    );
  }

  // Quiz Interface
  return (
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
                    <p className="text-[#14b8a6] font-bold text-lg">+{dailyResult.awardedPoints} Points Added! ⭐</p>
                  ) : dailyResult?.guest ? (
                    <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fbbf24]/30">
                      <p className="text-[#b45309] font-semibold">Sign in to earn points and compete!</p>
                      <Link href="/signin" className="inline-block mt-2 text-[#14b8a6] font-bold hover:underline">
                        Create an account →
                      </Link>
                    </div>
                  ) : (
                    <p className="text-[#a1633a]">Daily limit reached or learning mode</p>
                  )}
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
  );
}
