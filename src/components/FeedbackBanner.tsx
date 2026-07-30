"use client";

import React, { useEffect, useState } from 'react';
import { X, Send, Mail, Copy } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'kz_feedback_banner_dismissed_session';

export function FeedbackBanner() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const email = 'imediac786@gmail.com';

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFeedback = () => {
    const text = `Feedback - Islamic Kids Learning Platform\n\n${feedbackText}`;
    navigator.clipboard.writeText(text);
  };

  const dismissBanner = () => {
    setShowFeedback(false);
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors so the dismiss action still works.
    }
  };

  const openEmailFallback = () => {
    const subject = encodeURIComponent('Feedback - Islamic Kids Learning Platform');
    const body = encodeURIComponent(feedbackText.trim());
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setSubmitting(true);

    try {
      // Send feedback to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedbackText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        // Reset after 3 seconds
        setTimeout(() => {
          setFeedbackText('');
          setShowFeedback(false);
          setSubmitted(false);
        }, 3000);
      } else {
        copyFeedback();
        openEmailFallback();
        alert(`Automatic sending failed: ${data.error || 'Unknown error'}. Your email app has been opened and the feedback text was copied.`);
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      copyFeedback();
      openEmailFallback();
      alert('Failed to send feedback automatically. Your email app has been opened and the feedback text was copied.');
    } finally {
      setSubmitting(false);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <>
      {/* Feedback trigger */}
      <div className="flex items-center justify-center gap-3 px-3 py-1 bg-indigo-700 border-b border-indigo-800">
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="text-xs text-indigo-200 hover:text-white underline"
        >
          Feedback
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          className="text-indigo-200 hover:text-white"
          aria-label="Dismiss feedback banner"
          title="Dismiss feedback banner"
        >
          <X size={14} />
        </button>
      </div>

      {/* Feedback Box */}
      {showFeedback && (
        <div className="bg-white border-b border-gray-200 shadow-lg">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">📝 Send Feedback</h3>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold mb-1">✅ Thank you for your feedback!</p>
                <p className="text-sm text-green-600">Your message has been sent to our team.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts, report bugs, or suggest improvements..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  disabled={submitting}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      Send to: <span className="font-mono font-semibold">{email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={copyEmail}
                      className="text-blue-600 hover:text-blue-800"
                      title={copied ? 'Copied' : 'Copy email'}
                      aria-label={copied ? 'Email copied' : 'Copy email'}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!feedbackText.trim() || submitting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    <Send size={16} />
                    {submitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
