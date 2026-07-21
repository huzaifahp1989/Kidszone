interface OneSignalWebSDK {
  init(options: {
    appId: string;
    allowLocalhostAsSecureOrigin?: boolean;
    notifyButton?: { enable: boolean };
    serviceWorkerPath?: string;
  }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications?: {
    requestPermission(): Promise<boolean>;
    permission: boolean;
  };
  User?: {
    onesignalId?: string;
    PushSubscription?: {
      id?: string;
      optedIn: boolean;
    };
  };
}

interface Window {
  OneSignalDeferred?: Array<(oneSignal: OneSignalWebSDK) => void | Promise<void>>;
  OneSignal?: OneSignalWebSDK;
}
