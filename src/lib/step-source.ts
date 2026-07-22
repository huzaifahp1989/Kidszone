'use client';

/**
 * Native step provider bridge.
 *
 * Real step data must come from the phone's health service — Google Health
 * Connect (Android) or Apple HealthKit (iOS) — never from manual entry. Those
 * APIs are only reachable from the native app shell (a Capacitor Health plugin
 * or a WebToNative health bridge). This module attempts to read from whichever
 * native bridge is present and returns null on the plain web (where the
 * dashboard then shows a "connect your health app" state).
 *
 * To enable real tracking in the native build, expose ONE of:
 *   - window.Capacitor.Plugins.Health with getTodaySteps()/queryAggregated(), or
 *   - window.WTN.getStepCount(cb) / window.WTN.health.getSteps(cb)
 * returning today's step count (and optionally active minutes) from the OS
 * health store, with permission already granted.
 */

export interface StepReading {
  steps: number;
  minutes?: number;
  source: 'health_connect' | 'healthkit' | 'google_fit' | 'unknown';
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

/** True when a native health bridge appears to be available. */
export function nativeStepsSupported(): boolean {
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
  if (typeof window === 'undefined') return null;
  const w = window as AnyWindow;
  const source = platformSource();

  // Capacitor Health plugin
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
