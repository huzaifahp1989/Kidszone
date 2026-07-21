'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export type AudioRecorderState = 'idle' | 'recording' | 'finished';

export function useAudioRecorder(maxSeconds = 600) {
  const [state, setState] = useState<AudioRecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    stopStream();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setBlob(null);
    setSeconds(0);
    setState('idle');
    setError(null);
  }, [audioUrl, stopStream, stopTimer]);

  useEffect(() => () => reset(), [reset]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopTimer();
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Your browser does not support microphone recording.');
        return;
      }

      reset();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedType = PREFERRED_TYPES.find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
      );
      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
        if (recorder.state === 'inactive') {
          const blobType = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';
          const newBlob = new Blob(chunksRef.current, { type: blobType });
          setBlob(newBlob);
          setAudioUrl(URL.createObjectURL(newBlob));
          setState('finished');
          stopStream();
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= maxSeconds) {
            stopRecording();
            return maxSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError('Could not access microphone. Please allow mic permission and try again.');
      stopStream();
    }
  }, [maxSeconds, reset, stopRecording, stopStream]);

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    seconds,
    audioUrl,
    blob,
    error,
    isRecording: state === 'recording',
    formatTime,
    startRecording,
    stopRecording,
    reset,
  };
}
