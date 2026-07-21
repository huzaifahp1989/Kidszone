'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

interface ReadAloudButtonProps {
  /** The text to speak aloud. */
  text: string;
  /** Optional visible label (defaults to "Listen"). Pass "" to hide it. */
  label?: string;
  className?: string;
  /** Speaking rate; slightly slow by default so young readers can follow. */
  rate?: number;
  size?: 'sm' | 'md';
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred =
    voices.find((v) => /en(-|_)?GB/i.test(v.lang) && /female|Hazel|Libby|Sonia/i.test(v.name)) ||
    voices.find((v) => /en(-|_)?GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0];
  cachedVoice = preferred || null;
  return cachedVoice;
}

/**
 * A small, dependency-free "read aloud" button using the browser Web Speech
 * API. Renders nothing when speech synthesis is unavailable.
 */
export function ReadAloudButton({
  text,
  label = 'Listen',
  className = '',
  rate = 0.95,
  size = 'md',
}: ReadAloudButtonProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    // Voices can load asynchronously; warm the cache when they arrive.
    const onVoices = () => pickVoice();
    onVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
    };
  }, []);

  // Stop any speech if the component unmounts mid-sentence.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = rate;
    utterance.pitch = 1.05;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [text, rate]);

  const toggle = useCallback(() => {
    if (speaking) {
      stop();
    } else {
      speak();
    }
  }, [speaking, speak, stop]);

  if (!supported) return null;

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-3.5 py-2 text-sm gap-2';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={speaking ? 'Stop reading' : 'Read aloud'}
      className={`inline-flex items-center rounded-full font-bold transition interactive-focus touch-target ${sizeClasses} ${
        speaking
          ? 'bg-coral-500 text-white shadow-md'
          : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
      } ${className}`}
    >
      {speaking ? <Square size={size === 'sm' ? 14 : 16} /> : <Volume2 size={size === 'sm' ? 14 : 16} />}
      {label ? <span>{speaking ? 'Stop' : label}</span> : null}
    </button>
  );
}
