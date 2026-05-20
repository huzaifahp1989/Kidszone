'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SURVEY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeEVZHFkbYB6isXFrKrdsJszF3rho_3_NqlMHFYdIQ5SypKXg/viewform?usp=header';
const STORAGE_KEY = 'survey_popup_dismissed_date';

export function SurveyPopup() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      try {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        const today = new Date().toISOString().slice(0, 10);
        if (dismissed !== today) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(STORAGE_KEY, today);
    } catch {}
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '448px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid rgba(20,184,166,0.2)',
          overflow: 'hidden',
          animation: 'surveySlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(to right, #14b8a6, #0d9488)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Quick Survey</span>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: '#6a422d', fontSize: '14px', fontWeight: 500, margin: 0 }}>
            Assalamu Alaikum! 🌙
          </p>
          <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            Please fill this short survey on how you are finding this app. Your feedback helps us improve the experience for all kids! 🌟
          </p>
          <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
            <a
              href={SURVEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              style={{ flex: 1, textAlign: 'center', padding: '10px 16px', background: 'linear-gradient(to right, #14b8a6, #0d9488)', color: '#fff', fontWeight: 700, fontSize: '14px', borderRadius: '12px', textDecoration: 'none' }}
            >
              Fill Survey ✍️
            </a>
            <button
              onClick={dismiss}
              style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes surveySlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
