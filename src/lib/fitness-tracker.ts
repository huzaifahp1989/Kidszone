import { Capacitor } from '@capacitor/core';
import {
  CapacitorPedometer,
  type Measurement,
  type PermissionStatus,
} from '@capgo/capacitor-pedometer';

export type FitnessPlatform = 'android' | 'ios' | 'web';
export type FitnessPermissionState = PermissionStatus['activityRecognition'] | 'unsupported';

export type FitnessFeatures = {
  stepCounting: boolean;
  distance: boolean;
  pace: boolean;
  cadence: boolean;
  floorCounting: boolean;
};

export type FitnessMeasurement = {
  steps: number;
  distanceMeters: number | null;
  floorsAscended: number | null;
  floorsDescended: number | null;
  cadence: number | null;
  paceSecondsPerMeter: number | null;
  startDate: number | null;
  endDate: number | null;
  updatedAt: number;
  platform: FitnessPlatform;
  source: 'query' | 'live' | 'cache';
};

export type FitnessStatus = {
  native: boolean;
  available: boolean;
  platform: FitnessPlatform;
  permission: FitnessPermissionState;
  features: FitnessFeatures;
  measurement: FitnessMeasurement | null;
  message: string;
};

const CACHE_KEY = 'kids-zone-fitness-measurement-v1';

/** Android only reports session steps until updates start — keep one shared listener alive. */
let updatesStarted = false;
let updatesStarting: Promise<void> | null = null;
let sessionSteps = 0;
let sessionBaseline = 0;

function getPlatform(): FitnessPlatform {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return 'web';
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
}

function getDefaultFeatures(): FitnessFeatures {
  return {
    stepCounting: false,
    distance: false,
    pace: false,
    cadence: false,
    floorCounting: false,
  };
}

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toRoundedNumber(value: unknown): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

function getTodayKey(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function normalizeMeasurement(
  raw: Measurement,
  platform: FitnessPlatform,
  source: FitnessMeasurement['source']
): FitnessMeasurement {
  return {
    steps: toRoundedNumber(raw.numberOfSteps),
    distanceMeters: toNumber(raw.distance),
    floorsAscended: toNumber(raw.floorsAscended),
    floorsDescended: toNumber(raw.floorsDescended),
    cadence: toNumber(raw.currentCadence),
    paceSecondsPerMeter: toNumber(raw.currentPace),
    startDate: toNumber(raw.startDate),
    endDate: toNumber(raw.endDate),
    updatedAt: Date.now(),
    platform,
    source,
  };
}

function loadCachedMeasurement(): FitnessMeasurement | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dateKey?: string; measurement?: FitnessMeasurement };
    if (parsed.dateKey !== getTodayKey()) return null;
    return parsed.measurement ?? null;
  } catch {
    return null;
  }
}

function saveCachedMeasurement(measurement: FitnessMeasurement) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        dateKey: getTodayKey(measurement.updatedAt),
        measurement,
      })
    );
  } catch {
    /* localStorage unavailable */
  }
}

function mergeMeasurements(
  baseline: FitnessMeasurement | null,
  live: FitnessMeasurement,
  platform: FitnessPlatform
): FitnessMeasurement {
  if (platform === 'ios') {
    // iOS live updates are session-only; keep the higher of today's query vs cached.
    const steps = Math.max(baseline?.steps ?? 0, live.steps);
    return {
      ...live,
      steps,
      distanceMeters: live.distanceMeters ?? baseline?.distanceMeters ?? null,
      floorsAscended: live.floorsAscended ?? baseline?.floorsAscended ?? null,
      floorsDescended: live.floorsDescended ?? baseline?.floorsDescended ?? null,
      cadence: live.cadence ?? baseline?.cadence ?? null,
      paceSecondsPerMeter: live.paceSecondsPerMeter ?? baseline?.paceSecondsPerMeter ?? null,
      source: 'live',
      updatedAt: Date.now(),
    };
  }

  // Android: add session steps on top of the last known daily total.
  const steps = Math.max(baseline?.steps ?? 0, sessionBaseline + live.steps);
  return {
    ...live,
    steps,
    source: 'live',
    updatedAt: Date.now(),
  };
}

async function ensureMeasurementUpdates(platform: FitnessPlatform): Promise<void> {
  if (platform === 'web' || updatesStarted) return;
  if (updatesStarting) {
    await updatesStarting;
    return;
  }

  updatesStarting = (async () => {
    const cached = loadCachedMeasurement();
    sessionBaseline = cached?.steps ?? 0;
    sessionSteps = 0;

    await CapacitorPedometer.addListener('measurement', (event) => {
      const live = normalizeMeasurement(event, platform, 'live');
      sessionSteps = live.steps;
      const cached = loadCachedMeasurement();
      const merged = mergeMeasurements(cached, live, platform);
      saveCachedMeasurement(merged);
    });

    await CapacitorPedometer.startMeasurementUpdates();
    updatesStarted = true;
  })();

  try {
    await updatesStarting;
  } finally {
    updatesStarting = null;
  }
}

function resolveMessage(status: {
  native: boolean;
  available: boolean;
  permission: FitnessPermissionState;
  measurement: FitnessMeasurement | null;
  platform: FitnessPlatform;
}): string {
  if (!status.native) {
    return 'Step tracking works in the mobile app on Android or iPhone.';
  }
  if (!status.available) {
    return 'This device does not expose a step counter sensor.';
  }
  if (status.permission !== 'granted') {
    return 'Allow motion access to read your steps on this device.';
  }
  if (status.measurement) {
    return status.platform === 'ios'
      ? 'Showing steps measured today from your iPhone motion sensor.'
      : 'Counting steps from your Android phone while the app is open.';
  }
  return 'Ready to read steps when motion data becomes available.';
}

async function queryMeasurement(platform: FitnessPlatform): Promise<FitnessMeasurement | null> {
  if (platform === 'ios') {
    const raw = await CapacitorPedometer.getMeasurement({
      start: getStartOfToday(),
      end: Date.now(),
    });
    return normalizeMeasurement(raw, platform, 'query');
  }

  // Android getMeasurement() only returns session steps — start updates first.
  await ensureMeasurementUpdates(platform);
  const raw = await CapacitorPedometer.getMeasurement();
  const live = normalizeMeasurement(raw, platform, 'query');
  const cached = loadCachedMeasurement();
  return mergeMeasurements(cached, live, platform);
}

export async function getFitnessStatus(options: { requestPermission?: boolean } = {}): Promise<FitnessStatus> {
  const platform = getPlatform();
  const cachedMeasurement = loadCachedMeasurement();

  if (platform === 'web') {
    return {
      native: false,
      available: false,
      platform,
      permission: 'unsupported',
      features: getDefaultFeatures(),
      measurement: cachedMeasurement ? { ...cachedMeasurement, source: 'cache' } : null,
      message: resolveMessage({
        native: false,
        available: false,
        permission: 'unsupported',
        measurement: cachedMeasurement,
        platform,
      }),
    };
  }

  try {
    const availability = await CapacitorPedometer.isAvailable();
    const features: FitnessFeatures = {
      stepCounting: Boolean(availability.stepCounting),
      distance: Boolean(availability.distance),
      pace: Boolean(availability.pace),
      cadence: Boolean(availability.cadence),
      floorCounting: Boolean(availability.floorCounting),
    };

    let permission = (await CapacitorPedometer.checkPermissions()).activityRecognition ?? 'prompt';
    if (options.requestPermission && permission !== 'granted') {
      permission = (await CapacitorPedometer.requestPermissions()).activityRecognition ?? permission;
    }

    let measurement: FitnessMeasurement | null = cachedMeasurement
      ? { ...cachedMeasurement, source: 'cache' }
      : null;
    if (features.stepCounting && permission === 'granted') {
      try {
        const queried = await queryMeasurement(platform);
        measurement = queried;
        if (queried) saveCachedMeasurement(queried);
      } catch {
        // Keep the most recent cached value if a live query fails.
      }
    }

    return {
      native: true,
      available: features.stepCounting,
      platform,
      permission,
      features,
      measurement,
      message: resolveMessage({
        native: true,
        available: features.stepCounting,
        permission,
        measurement,
        platform,
      }),
    };
  } catch {
    return {
      native: true,
      available: false,
      platform,
      permission: 'denied',
      features: getDefaultFeatures(),
      measurement: cachedMeasurement ? { ...cachedMeasurement, source: 'cache' } : null,
      message: 'The pedometer plugin is not ready yet. Install native dependencies and sync the app.',
    };
  }
}

/** Read today's step count from the native pedometer (for fitness sync). */
export async function readPedometerSteps(): Promise<{
  steps: number;
  minutes?: number;
  source: 'pedometer';
} | null> {
  const status = await getFitnessStatus();
  if (!status.native || !status.available || status.permission !== 'granted') return null;
  const steps = status.measurement?.steps ?? 0;
  if (!Number.isFinite(steps)) return null;
  return { steps, source: 'pedometer' };
}

export async function requestPedometerPermission(): Promise<boolean> {
  const status = await getFitnessStatus({ requestPermission: true });
  return status.permission === 'granted';
}

export function pedometerSupported(): boolean {
  return getPlatform() !== 'web';
}

export async function startFitnessUpdates(
  onMeasurement: (measurement: FitnessMeasurement) => void
): Promise<() => Promise<void>> {
  const platform = getPlatform();
  if (platform === 'web') {
    return async () => {};
  }

  await ensureMeasurementUpdates(platform);

  const listener = await CapacitorPedometer.addListener('measurement', (event) => {
    const live = normalizeMeasurement(event, platform, 'live');
    sessionSteps = live.steps;
    const cached = loadCachedMeasurement();
    const measurement = mergeMeasurements(cached, live, platform);
    saveCachedMeasurement(measurement);
    onMeasurement(measurement);
  });

  return async () => {
    try {
      await listener.remove();
    } catch {
      /* listener already removed */
    }
  };
}
