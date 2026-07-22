/**
 * Server-only OneSignal App ID config.
 *
 * Primary app = WTN / current (ONESIGNAL_APP_ID).
 * Legacy app = older website subscribers (daf8fc36…) so admin can still reach them.
 */

export const LEGACY_ONESIGNAL_APP_ID_DEFAULT = 'daf8fc36-781a-417d-8ee4-5078635f22e7';

export type OneSignalAppTarget = {
  label: string;
  appId: string;
  restApiKey: string;
};

function clean(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function getServerOneSignalAppId(override?: string | null): string {
  const fromOverride = clean(override);
  if (fromOverride) return fromOverride;

  return (
    clean(process.env.ONESIGNAL_APP_ID) ||
    clean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) ||
    '0bb81263-a5f5-4fd8-8786-d71f43a43725'
  );
}

function restKeyOrNull(value?: string | null): string | null {
  const key = clean(value);
  // Real OneSignal REST keys are long; reject empty / placeholder values.
  return key.length >= 20 ? key : null;
}

function getPrimaryRestApiKey(): string | null {
  return restKeyOrNull(process.env.ONESIGNAL_REST_API_KEY);
}

function getLegacyRestApiKey(): string | null {
  return (
    restKeyOrNull(process.env.ONESIGNAL_LEGACY_REST_API_KEY) ||
    restKeyOrNull(process.env.ONESIGNAL_WEB_REST_API_KEY) ||
    null
  );
}

export function getLegacyOneSignalAppId(): string {
  return clean(process.env.ONESIGNAL_LEGACY_APP_ID) || LEGACY_ONESIGNAL_APP_ID_DEFAULT;
}

/** Separate iOS OneSignal app (Apple push is often its own app with its own REST key). */
function getIosRestApiKey(): string | null {
  return restKeyOrNull(process.env.ONESIGNAL_IOS_REST_API_KEY);
}

export function getIosOneSignalAppId(): string {
  return clean(process.env.ONESIGNAL_IOS_APP_ID);
}

/**
 * Apps we can send to from admin.
 * - Always includes primary when REST key exists.
 * - Includes legacy website app when ONESIGNAL_LEGACY_REST_API_KEY is set
 *   (or when primary key is reused only if explicitly allowed — we never reuse
 *   mismatched keys; legacy needs its own key).
 */
export function getOneSignalAppTargets(overrideAppId?: string | null): OneSignalAppTarget[] {
  const primaryKey = getPrimaryRestApiKey();
  const targets: OneSignalAppTarget[] = [];
  const override = clean(overrideAppId);

  if (override && primaryKey) {
    // Admin paste override: send only to that app with the primary key
    return [{ label: 'override', appId: override, restApiKey: primaryKey }];
  }

  if (primaryKey) {
    targets.push({
      label: 'primary',
      appId: getServerOneSignalAppId(),
      restApiKey: primaryKey,
    });
  }

  // Separate iOS app (Apple) — has its own App ID + REST key.
  const iosKey = getIosRestApiKey();
  const iosAppId = getIosOneSignalAppId();
  if (iosKey && iosAppId && !targets.some((t) => t.appId === iosAppId)) {
    targets.push({
      label: 'ios',
      appId: iosAppId,
      restApiKey: iosKey,
    });
  }

  const legacyKey = getLegacyRestApiKey();
  const legacyAppId = getLegacyOneSignalAppId();
  if (legacyKey && legacyAppId && !targets.some((t) => t.appId === legacyAppId)) {
    targets.push({
      label: 'legacy',
      appId: legacyAppId,
      restApiKey: legacyKey,
    });
  }

  return targets;
}
