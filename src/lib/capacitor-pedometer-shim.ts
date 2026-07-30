export type PermissionStatus = {
  activityRecognition: 'granted' | 'denied' | 'prompt' | 'limited' | 'restricted' | 'unsupported';
};

export type Measurement = {
  numberOfSteps: number;
  distance?: number | null;
  floorsAscended?: number | null;
  floorsDescended?: number | null;
  currentCadence?: number | null;
  currentPace?: number | null;
  startDate?: number | null;
  endDate?: number | null;
};

export const CapacitorPedometer = {
  async checkPermissions(): Promise<PermissionStatus> {
    return { activityRecognition: 'prompt' };
  },
  async requestPermissions(): Promise<PermissionStatus> {
    return { activityRecognition: 'prompt' };
  },
  async isAvailable() {
    return {
      stepCounting: false,
      distance: false,
      pace: false,
      cadence: false,
      floorCounting: false,
    };
  },
  async addListener(_event: string, _listener: (event: Measurement) => void) {
    return { remove: async () => undefined };
  },
  async startMeasurementUpdates() {
    return undefined;
  },
  async getMeasurement(_options?: { start?: number; end?: number }) {
    return {
      numberOfSteps: 0,
      distance: 0,
      floorsAscended: 0,
      floorsDescended: 0,
      currentCadence: 0,
      currentPace: 0,
      startDate: 0,
      endDate: 0,
    } as Measurement;
  },
};
