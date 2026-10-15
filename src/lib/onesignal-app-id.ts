/**
 * Shared OneSignal App IDs (safe for client + server).
 *
 * Native Android / WTN uses the primary app (mobile push).
 * Native iOS uses a dedicated Apple app (its own APNs credentials) when configured,
 * so iPhone devices register on the app the server can actually send to.
 * Browser uses the web-configured app — the WTN app is not set up for web push,
 * so init with the primary ID alone causes "App not configured for web push".
 */

export const ONESIGNAL_APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '0bb81263-a5f5-4fd8-8786-d71f43a43725';

/** Native iOS — dedicated OneSignal app (separate APNs credentials). Optional. */
export const ONESIGNAL_IOS_APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_IOS_APP_ID || '';

/** Website / Chrome push — OneSignal app that has Web Push enabled. */
export const ONESIGNAL_WEB_APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_WEB_APP_ID ||
  process.env.NEXT_PUBLIC_ONESIGNAL_LEGACY_APP_ID ||
  'daf8fc36-781a-417d-8ee4-5078635f22e7';
