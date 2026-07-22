'use client';

/**
 * Native step provider bridge.
 *
 * Reads today's step count from the phone's built-in pedometer via the
 * Capacitor Pedometer plugin (Android TYPE_STEP_COUNTER / iOS CMPedometer).
 * Falls back to legacy Health Connect / HealthKit bridges when present.
 */

import {
  getFitnessStatus,
  pedometerSupported,
  readPedometerSteps,
  requestPedometerPermission,
} from '@/lib/fitness-tracker';

export interface StepReading {
  steps: number;
  minutes?: number;
  source: 'health_connect' | 'healthkit' | 'google_fit' | 'pedometer' | 'unknown';
}

type AnyWindow = Window & {
  Capacitor?: { getPlatform?: () => string; Plugins?: Record<string, unknown> };
  WTN?: Record<string, unknown>;
};

function platformSource(): StepReading['source'] {
  if (typeof window === 'undefined') return 'unknown';
  const w = window as AnyWindow;
  const p = w.Capacitor?.getPlatform?.();
  if (p === 'ios') return 'healthkit';
  if (p === 'android') return 'health_connect';
  return 'unknown';
}

/** True when a native step source appears to be available. */
export function nativeStepsSupported(): boolean {
  if (pedometerSupported()) return true;

  if (typeof window === 'undefined') return false;
  const w = window as AnyWindow;
  const health = w.Capacitor?.Plugins?.Health as Record<string, unknown> | undefined;
  const wtn = w.WTN as Record<string, unknown> | undefined;
  return Boolean(
    (health && (typeof health.getTodaySteps === 'function' || typeof health.queryAggregated === 'function')) ||
      (wtn && (typeof wtn.getStepCount === 'function' || (wtn.health as Record<string, unknown> | undefined)?.getSteps))
  );
}

/** Request permission to read steps from the native health service (if supported). */
export async function requestStepPermission(): Promise<boolean> {
  if (pedometerSupported()) {
    return requestPedometerPermission();
  }

  if (typeof window === 'undefined') return false;
  const w = window as AnyWindow;
  const health = w.Capacitor?.Plugins?.Health as Record<string, unknown> | undefined;
  try {
    if (health && typeof health.requestAuthorization === 'function') {
      await (health.requestAuthorization as (opts: unknown) => Promise<unknown>)({ read: ['steps'] });
      return true;
    }
  } catch {
    /* ignore */
  }
  return nativeStepsSupported();
}

/** Read today's steps from the native health store. Returns null on plain web. */
export async function readNativeSteps(): Promise<StepReading | null> {
  // Prefer the built-in pedometer plugin (works without Health Connect / HealthKit).
  const pedometerReading = await readPedometerSteps();
  if (pedometerReading) return pedometerReading;

  if (typeof window === 'undefined') return null;
  const w = window as AnyWindow;
  const source = platformSource();

  // Capacitor Health plugin (optional legacy bridge)
  try {
    const health = w.Capacitor?.Plugins?.Health as Record<string, unknown> | undefined;
    if (health) {
      if (typeof health.getTodaySteps === 'function') {
        const res = (await (health.getTodaySteps as () => Promise<unknown>)()) as { steps?: number; minutes?: number } | number;
        const steps = typeof res === 'number' ? res : Number(res?.steps ?? 0);
        if (Number.isFinite(steps)) return { steps, minutes: typeof res === 'object' ? Number(res?.minutes ?? 0) : undefined, source };
      }
    }
  } catch {
    /* ignore */
  }

  // WebToNative bridge (callback style)
  try {
    const wtn = w.WTN as Record<string, unknown> | undefined;
    const getter = (wtn?.getStepCount || (wtn?.health as Record<string, unknown> | undefined)?.getSteps) as
      | ((cb: (v: unknown) => void) => void)
      | undefined;
    if (typeof getter === 'function') {
      const value = await new Promise<unknown>((resolve) => {
        let settled = false;
        const done = (v: unknown) => {
          if (!settled) {
            settled = true;
            resolve(v);
          }
        };
        try {
          getter(done);
        } catch {
          done(null);
        }
        setTimeout(() => done(null), 8000);
      });
      const steps = Number((value as { steps?: number } | number as { steps?: number })?.steps ?? (typeof value === 'number' ? value : 0));
      if (Number.isFinite(steps) && steps >= 0) return { steps, source };
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Check whether motion/pedometer permission has been granted. */
export async function hasStepPermission(): Promise<boolean> {
  const status = await getFitnessStatus();
  return status.permission === 'granted';
}
