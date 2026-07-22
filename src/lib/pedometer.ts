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
  const initializedRef = useRef(false);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  // Peak/valley state machine + cadence lock (rejects shaking / random motion).
  const peakingRef = useRef(false);
  const peakAmpRef = useRef(0);
  const lastStepTsRef = useRef(0);
  const runRef = useRef(0);

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
    // Low-pass running mean to remove the gravity/orientation baseline.
    avgRef.current = avgRef.current * 0.88 + mag * 0.12;
    const dynamic = mag - avgRef.current;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Tuned for real walking, to reject shaking / waving the phone:
    const PEAK_HIGH = 1.8; // must rise this far above baseline to be a footfall peak
    const VALLEY_LOW = -0.8; // ...then fall below this to complete one up/down step
    const PEAK_MAX = 9.0; // above this it's a violent shake/drop, not a step
    const MIN_STEP_MS = 300; // faster than this = shaking, not walking
    const MAX_STEP_MS = 1800; // slower than this breaks the walking rhythm
    const REQUIRED_RUN = 3; // consecutive rhythmic steps before we start counting

    // Track the highest peak of the current up-swing.
    if (dynamic > PEAK_HIGH) {
      peakingRef.current = true;
      if (dynamic > peakAmpRef.current) peakAmpRef.current = dynamic;
      return;
    }

    // Complete a step only on the down-swing after a real peak (full oscillation).
    if (peakingRef.current && dynamic < VALLEY_LOW) {
      peakingRef.current = false;
      const amp = peakAmpRef.current;
      peakAmpRef.current = 0;
      const interval = now - lastStepTsRef.current;
      lastStepTsRef.current = now;

      const rhythmic = interval >= MIN_STEP_MS && interval <= MAX_STEP_MS;
      const plausible = amp <= PEAK_MAX;

      if (rhythmic && plausible) {
        runRef.current += 1;
        // Only credit steps once a sustained walking rhythm is established.
        if (runRef.current === REQUIRED_RUN) {
          setSteps((s) => s + REQUIRED_RUN);
        } else if (runRef.current > REQUIRED_RUN) {
          setSteps((s) => s + 1);
        }
      } else {
        // Too fast/slow/violent → rhythm broken (e.g. a shake). Start over.
        runRef.current = 0;
      }
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
      peakingRef.current = false;
      peakAmpRef.current = 0;
      runRef.current = 0;
      lastStepTsRef.current = 0;
      attach();
    } catch {
      setError('Could not start the step counter.');
    }
  }, [attach]);

  const reset = useCallback(() => setSteps(0), []);

  useEffect(() => () => stop(), [stop]);

  return { supported, running, steps, needsPermission, error, start, stop, reset };
}
