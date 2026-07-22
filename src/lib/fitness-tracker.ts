import { Capacitor } from '@capacitor/core';

export type FitnessPlatform = 'android' | 'ios' | 'web';
export type FitnessPermissionState =
  | 'prompt'
  | 'prompt-with-rationale'
  | 'granted'
  | 'denied'
  | 'unsupported';

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

type PedometerModule = {
  CapacitorPedometer: {
    isAvailable(): Promise<Partial<FitnessFeatures>>;
    checkPermissions(): Promise<{ activityRecognition?: FitnessPermissionState }>;
    requestPermissions(): Promise<{ activityRecognition?: FitnessPermissionState }>;
    getMeasurement(options?: { start?: number; end?: number }): Promise<Record<string, unknown>>;
    addListener(
      eventName: 'measurement',
      listener: (event: Record<string, unknown>) => void
    ): Promise<{ remove(): Promise<void> }>;
    startMeasurementUpdates(): Promise<void>;
    stopMeasurementUpdates(): Promise<void>;
  };
};

const CACHE_KEY = 'kids-zone-fitness-measurement-v1';

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
  raw: Record<string, unknown>,
  platform: FitnessPlatform,
  source: FitnessMeasurement['source']
): FitnessMeasurement {
  const updatedAt = Date.now();

  return {
    steps: toRoundedNumber(raw.numberOfSteps),
    distanceMeters: toNumber(raw.distance),
    floorsAscended: toNumber(raw.floorsAscended),
    floorsDescended: toNumber(raw.floorsDescended),
    cadence: toNumber(raw.currentCadence),
    paceSecondsPerMeter: toNumber(raw.currentPace),
    startDate: toNumber(raw.startDate),
    endDate: toNumber(raw.endDate),
    updatedAt,
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

async function getPedometer() {
  const pedometerModule = (await import('@capgo/capacitor-pedometer')) as PedometerModule;
  return pedometerModule.CapacitorPedometer;
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
      : 'Showing live steps from your Android phone while the app is open.';
  }
  return 'Ready to read steps when motion data becomes available.';
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
    const pedometer = await getPedometer();
    const availability = await pedometer.isAvailable();
    const features: FitnessFeatures = {
      stepCounting: Boolean(availability.stepCounting),
      distance: Boolean(availability.distance),
      pace: Boolean(availability.pace),
      cadence: Boolean(availability.cadence),
      floorCounting: Boolean(availability.floorCounting),
    };

    let permission = (await pedometer.checkPermissions()).activityRecognition ?? 'prompt';
    if (options.requestPermission && permission !== 'granted') {
      permission = (await pedometer.requestPermissions()).activityRecognition ?? permission;
    }

    let measurement = cachedMeasurement ? { ...cachedMeasurement, source: 'cache' as const } : null;
    if (features.stepCounting && permission === 'granted') {
      try {
        const rawMeasurement =
          platform === 'ios'
            ? await pedometer.getMeasurement({ start: getStartOfToday(), end: Date.now() })
            : await pedometer.getMeasurement();
        measurement = normalizeMeasurement(rawMeasurement, platform, 'query');
        saveCachedMeasurement(measurement);
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

export async function startFitnessUpdates(
  onMeasurement: (measurement: FitnessMeasurement) => void
): Promise<() => Promise<void>> {
  const platform = getPlatform();
  if (platform === 'web') {
    return async () => {};
  }

  const pedometer = await getPedometer();
  const listener = await pedometer.addListener('measurement', (event) => {
    const measurement = normalizeMeasurement(event, platform, 'live');
    saveCachedMeasurement(measurement);
    onMeasurement(measurement);
  });

  await pedometer.startMeasurementUpdates();

  return async () => {
    try {
      await listener.remove();
    } catch {
      /* listener already removed */
    }
    try {
      await pedometer.stopMeasurementUpdates();
    } catch {
      /* updates already stopped */
    }
  };
}
