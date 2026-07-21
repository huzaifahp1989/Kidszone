/** Same GA4 property as Firebase Analytics (islam-media-stats). */
const DEFAULT_MEASUREMENT_ID = 'G-8LHGLLY2NC';

export function getGoogleAnalyticsMeasurementId(): string {
  const measurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    DEFAULT_MEASUREMENT_ID;

  return measurementId.trim() || DEFAULT_MEASUREMENT_ID;
}

export function isGoogleAnalyticsEnabled(): boolean {
  return Boolean(getGoogleAnalyticsMeasurementId());
}
