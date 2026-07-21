import { afterEach, describe, expect, it } from 'vitest';
import { getGoogleAnalyticsMeasurementId, isGoogleAnalyticsEnabled } from './google-analytics';

describe('google analytics helpers', () => {
  const originalGaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const originalGoogleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const originalFirebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  afterEach(() => {
    if (originalGaMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGaMeasurementId;
    }

    if (originalGoogleAnalyticsId === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = originalGoogleAnalyticsId;
    }

    if (originalFirebaseMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFirebaseMeasurementId;
    }
  });

  it('falls back to the islam-media-stats measurement id', () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    expect(getGoogleAnalyticsMeasurementId()).toBe('G-8LHGLLY2NC');
    expect(isGoogleAnalyticsEnabled()).toBe(true);
  });

  it('uses the configured measurement id when present', () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';

    expect(getGoogleAnalyticsMeasurementId()).toBe('G-TEST123');
    expect(isGoogleAnalyticsEnabled()).toBe(true);
  });
});
