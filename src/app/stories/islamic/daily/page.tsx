'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { BookOpen, Users, Heart, CheckCircle, Award } from 'lucide-react';
import { getStoriesForDay } from '@/data/islamic-stories';
import type { IslamicStory } from '@/data/islamic-stories';
import { useAuth } from '@/lib/auth-context';
import { usePointsProgress } from '@/lib/points-progress-context';

const STORY_POINTS = 25;

export default function DailyStoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshPoints } = usePointsProgress();
  const [story, setStory] = useState<IslamicStory | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const todaysStory = getStoriesForDay();
    if (todaysStory.length > 0) {
      setStory(todaysStory[0]);
    }
  }, []);

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const allQuestionsAnswered = story && story.questions.every((q) => answers[q.id] !== undefined);

  const calculateScore = (): { correct: number; total: number } => {
    if (!story) return { correct: 0, total: 0 };

    let correct = 0;
    story.questions.forEach((q) => {
      if (q.type !== 'open' && q.correctAnswer !== undefined) {
        if (answers[q.id] === q.correctAnswer) {
          correct++;
        }
      }
    });

    return { correct, total: story.questions.length };
  };

  const completeStory = async () => {
    if (!user?.id || !allQuestionsAnswered) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Award points via activity endpoint
      const response = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: `story-${story?.id || 'daily'}`,
          activityType: 'story',
          points: STORY_POINTS,
          metadata: {
            storyId: story?.id,
            storyTitle: story?.title,
            questionsAnswered: Object.keys(answers).length,
            totalQuestions: story?.questions.length,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete story');
      }

      const data = await response.json();
      setSubmitSuccess(true);
      setSubmitMessage(
        `✅ Excellent work! You earned ${STORY_POINTS} points and learned a valuable lesson!`
      );

      // Refresh points context
      await refreshPoints();

      // Redirect after success
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error completing story:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete story';
      setSubmitMessage(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!story) {
    return (
      <div className="page-inner">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-500">Loading today's story...</div>
        </div>
      </div>
    );
  }

  const { correct, total } = calculateScore();

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center gap-2 text-sm">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Home
          </Button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
            <BookOpen size={14} className="text-orange-700" />
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Daily Story</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{story.title}</h1>
          <p className="text-sm text-slate-600">Read, reflect, and answer questions • 25 points</p>
        </div>

        {/* Main Story Card */}
        <div className="rounded-xl shadow-lg overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-orange-100 mb-1">
                  Today's Story
                </div>
                <h2 className="text-xl md:text-2xl font-bold">{story.title}</h2>
              </div>
              <Award size={24} className="text-yellow-300" />
            </div>
          </div>

          {/* Story Content */}
          <div className="p-4 md:p-5 space-y-4">
            {/* Characters */}
            {story.characters && story.characters.length > 0 && (
              <div className="rounded-lg bg-white p-4 border border-orange-100">
                <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-orange-600" />
                  Characters in This Story
                </h3>
                <div className="flex flex-wrap gap-2">
                  {story.characters.map((char, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative */}
            <div className="rounded-lg bg-white p-4 border border-orange-100">
              <h3 className="font-bold text-sm text-slate-900 mb-3">The Story</h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{story.narrative}</p>
            </div>

            {/* Lesson */}
            <div className="rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 p-4 border border-amber-200">
              <h3 className="font-bold text-sm text-amber-900 mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span>
                The Lesson
              </h3>
              <p className="text-sm text-amber-900 leading-relaxed">{story.lesson}</p>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>❓</span> Answer the Questions
          </h2>

          {story.questions.map((question, qIdx) => (
            <div key={question.id} className="rounded-lg bg-white p-4 border border-slate-200 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900">
                  Question {qIdx + 1}: {question.question}
                </h4>
                {answers[question.id] !== undefined && question.type !== 'open' && (
                  <div className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800">
                    ✓ Answered
                  </div>
                )}
              </div>

              {/* Multiple Choice */}
              {question.type === 'multiple-choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={idx}
                        checked={answers[question.id] === idx}
                        onChange={(e) => handleAnswerChange(question.id, Number(e.target.value))}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span className="text-sm text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* True/False */}
              {question.type === 'true-false' && (
                <div className="space-y-2">
                  {['True', 'False'].map((option, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={idx}
                        checked={answers[question.id] === idx}
                        onChange={(e) => handleAnswerChange(question.id, Number(e.target.value))}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span className="text-sm text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Open-ended */}
              {question.type === 'open' && (
                <textarea
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Write your answer here..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  rows={3}
                />
              )}
            </div>
          ))}
        </div>

        {/* Score Info */}
        {Object.keys(answers).length > 0 && (
          <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 border border-purple-200">
            <p className="text-sm text-slate-700">
              <strong>Progress:</strong> {Object.keys(answers).length} of {story.questions.length} questions
              answered
              {correct > 0 && ` • ${correct}/${total} correct so far`}
            </p>
          </div>
        )}

        {/* Submit Message */}
        {submitMessage && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              submitSuccess
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {submitMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <Button
            variant={allQuestionsAnswered ? 'primary' : 'outline'}
            onClick={completeStory}
            disabled={!allQuestionsAnswered || !user?.id || isSubmitting || submitSuccess}
            className="w-full"
          >
            {!user?.id ? (
              '🔒 Sign In to Complete'
            ) : isSubmitting ? (
              '⏳ Submitting...'
            ) : submitSuccess ? (
              <>
                <CheckCircle size={18} />
                Story Completed! 25 points earned
              </>
            ) : allQuestionsAnswered ? (
              <>
                <Award size={18} />
                Complete Story & Earn 25 Points
              </>
            ) : (
              `Answer all ${story.questions.length} questions to continue`
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/stories/islamic')}
            className="w-full"
          >
            📚 Browse All Stories
          </Button>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <h4 className="font-bold text-sm text-blue-900 mb-2">💭 Remember:</h4>
          <p className="text-sm text-blue-900">
            Islamic stories teach us important lessons about kindness, honesty, patience, and respect.
            Think about how you can apply these lessons in your daily life!
          </p>
        </div>
      </div>
    </div>
  );
}
