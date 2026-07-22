'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * In-app step counter using the device motion sensor (accelerometer).
 *
 * This works in mobile browsers and inside the WebToNative webview while the
 * Fitness page is OPEN (foreground). It cannot count steps in the background or
 * when the app is closed — that requires the native Health Connect / HealthKit
 * integration. It is a real sensor-based counter (not manual entry): it detects
 * walking peaks in the acceleration signal.
 */

type MotionEventCtor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

export interface Pedometer {
  supported: boolean;
  running: boolean;
  steps: number;
  needsPermission: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function usePedometer(): Pedometer {
  const [supported, setSupported] = useState(false);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avgRef = useRef(0);
  const wasAboveRef = useRef(false);
  const lastStepTsRef = useRef(0);
  const initializedRef = useRef(false);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Defer state updates out of the synchronous effect body.
    queueMicrotask(() => {
      const ok = typeof window.DeviceMotionEvent !== 'undefined';
      setSupported(ok);
      const ctor = window.DeviceMotionEvent as unknown as MotionEventCtor | undefined;
      if (ok && ctor && typeof ctor.requestPermission === 'function') {
        setNeedsPermission(true); // iOS 13+ needs an explicit gesture-driven grant
      }
    });
  }, []);

  const onMotion = useCallback((e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

    if (!initializedRef.current) {
      avgRef.current = mag;
      initializedRef.current = true;
      return;
    }
    // Low-pass running mean to remove gravity/orientation baseline.
    avgRef.current = avgRef.current * 0.9 + mag * 0.1;
    const dynamic = mag - avgRef.current;

    const THRESHOLD = 1.1; // m/s^2 above baseline to count as a footfall peak
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (dynamic > THRESHOLD && !wasAboveRef.current) {
      wasAboveRef.current = true;
      // Debounce: a person cannot step more than ~4x/second.
      if (now - lastStepTsRef.current > 260) {
        lastStepTsRef.current = now;
        setSteps((s) => s + 1);
      }
    } else if (dynamic < THRESHOLD * 0.5) {
      wasAboveRef.current = false;
    }
  }, []);

  const attach = useCallback(() => {
    if (handlerRef.current) return;
    handlerRef.current = onMotion;
    window.addEventListener('devicemotion', onMotion);
    setRunning(true);
  }, [onMotion]);

  const stop = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener('devicemotion', handlerRef.current);
      handlerRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') {
      setError('Step counting is not supported on this device.');
      return;
    }
    const ctor = window.DeviceMotionEvent as unknown as MotionEventCtor;
    try {
      if (typeof ctor.requestPermission === 'function') {
        const res = await ctor.requestPermission();
        if (res !== 'granted') {
          setError('Motion access was not allowed. Please enable it to count steps.');
          return;
        }
        setNeedsPermission(false);
      }
      initializedRef.current = false;
      wasAboveRef.current = false;
      attach();
    } catch {
      setError('Could not start the step counter.');
    }
  }, [attach]);

  const reset = useCallback(() => setSteps(0), []);

  useEffect(() => () => stop(), [stop]);

  return { supported, running, steps, needsPermission, error, start, stop, reset };
}
