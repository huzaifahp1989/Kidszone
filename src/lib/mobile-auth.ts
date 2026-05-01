import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';

export interface MobileAuthError {
  code: string;
  message: string;
  isMobileSpecific: boolean;
  suggestedActions: string[];
}

export class MobileAuthHelper {
  private static instance: MobileAuthHelper;
  
  private constructor() {}
  
  static getInstance(): MobileAuthHelper {
    if (!MobileAuthHelper.instance) {
      MobileAuthHelper.instance = new MobileAuthHelper();
    }
    return MobileAuthHelper.instance;
  }

  private async waitForSession(attempts = 10, delayMs = 200) {
    for (let i = 0; i < attempts; i++) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user?.id) {
        return sessionData.session;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  }

  isMobileBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android', 'webos', 'iphone', 'ipad', 'ipod', 
      'blackberry', 'iemobile', 'opera mini', 'mobile'
    ];
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
  }

  isWebView(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      userAgent.includes('wv') || // Android WebView
      userAgent.includes('webkit') && userAgent.includes('version') || // iOS WebView
      (window as any).webkit?.messageHandlers !== undefined // iOS WKWebView
    );
  }

  checkStorageAvailability(): { localStorage: boolean; sessionStorage: boolean; error?: string } {
    if (typeof window === 'undefined') {
      return { localStorage: false, sessionStorage: false, error: 'Window not available' };
    }

    try {
      const testKey = `test-storage-${Date.now()}`;
      const testValue = 'test';
      
      // Test localStorage
      let localStorageAvailable = false;
      try {
        localStorage.setItem(testKey, testValue);
        localStorage.removeItem(testKey);
        localStorageAvailable = true;
      } catch (e) {
        console.warn('localStorage test failed:', e);
      }

      // Test sessionStorage
      let sessionStorageAvailable = false;
      try {
        sessionStorage.setItem(testKey, testValue);
        sessionStorage.removeItem(testKey);
        sessionStorageAvailable = true;
      } catch (e) {
        console.warn('sessionStorage test failed:', e);
      }

      return {
        localStorage: localStorageAvailable,
        sessionStorage: sessionStorageAvailable,
        error: !localStorageAvailable && !sessionStorageAvailable ? 'No storage available' : undefined
      };
    } catch (error) {
      return {
        localStorage: false,
        sessionStorage: false,
        error: `Storage test error: ${error}`
      };
    }
  }

  async signInWithMobileSupport(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    error?: MobileAuthError;
  }> {
    try {
      console.log('🔐 Starting mobile-optimized sign in...');
      
      // Check storage availability first
      const storageCheck = this.checkStorageAvailability();
      if (!storageCheck.localStorage && !storageCheck.sessionStorage) {
        return {
          success: false,
          error: {
            code: 'STORAGE_UNAVAILABLE',
            message: 'Browser storage is not available. Please enable cookies and try again.',
            isMobileSpecific: true,
            suggestedActions: [
              'Enable cookies in your browser settings',
              'Try using a different browser',
              'Disable private/incognito mode'
            ]
          }
        };
      }

      // Check if we're in a WebView
      if (this.isWebView()) {
        console.log('📱 Detected WebView environment');
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('❌ Sign in failed:', error);
        return {
          success: false,
          error: this.handleAuthError(error)
        };
      }

      if (!data.user?.id) {
        return {
          success: false,
          error: {
            code: 'NO_USER_ID',
            message: 'Sign in succeeded but no user ID returned',
            isMobileSpecific: false,
            suggestedActions: ['Contact support']
          }
        };
      }

      console.log('✅ Sign in successful, user ID:', data.user.id);

      // Verify session persistence (with short retries for slower mobile/WebView storage)
      const session = await this.waitForSession(10, 200);
      if (!session) {
        console.warn('⚠️ Session not persisted after sign in');
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_PERSISTED',
            message: 'Session was not saved. This may be due to browser storage restrictions.',
            isMobileSpecific: true,
            suggestedActions: [
              'Check browser storage settings',
              'Try disabling private/incognito mode',
              'Use a different browser'
            ]
          }
        };
      }

      // Ensure user profile exists
      console.log('🔧 Ensuring user profile exists...');
      const profileCreated = await ensureUserProfile(data.user.id);
      if (!profileCreated) {
        console.warn('⚠️ Profile creation failed');
      }

      return {
        success: true,
        user: data.user
      };

    } catch (error: any) {
      console.error('🚨 Unexpected sign in error:', error);
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error.message || 'An unexpected error occurred',
          isMobileSpecific: false,
          suggestedActions: ['Try again', 'Contact support if the issue persists']
        }
      };
    }
  }

  private handleAuthError(error: any): MobileAuthError {
    const errorMessage = error.message || error.toString();
    const isMobile = this.isMobileBrowser();

    // Enhanced error logging for debugging
    console.error('🔍 Auth Error Details:', {
      code: error.code,
      message: errorMessage,
      isMobile: isMobile,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      storageAvailable: this.checkStorageAvailability()
    });

    // Mobile-specific error handling
    if (isMobile) {
      if (errorMessage.includes('localStorage') || errorMessage.includes('storage')) {
        return {
          code: 'MOBILE_STORAGE_ERROR',
          message: 'Browser storage issue. Please enable cookies and local storage.',
          isMobileSpecific: true,
          suggestedActions: [
            'Enable cookies in browser settings',
            'Try a different browser',
            'Disable private/incognito mode'
          ]
        };
      }

      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return {
          code: 'MOBILE_NETWORK_ERROR',
          message: 'Network connection issue. Please check your internet connection.',
          isMobileSpecific: true,
          suggestedActions: [
            'Check internet connection',
            'Try switching between WiFi and mobile data',
            'Restart your browser'
          ]
        };
      }
    }

    // General auth errors with enhanced messages
    switch (error.code) {
      case 'invalid_credentials':
        return {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please double-check your credentials and try again.',
          isMobileSpecific: false,
          suggestedActions: [
            'Check your email and password for typos',
            'Reset your password if you forgot it'
          ]
        };

      case 'email_not_confirmed':
        return {
          code: 'EMAIL_NOT_CONFIRMED',
          message: 'Email not confirmed. Please check your inbox to verify your account.',
          isMobileSpecific: false,
          suggestedActions: ['Check your email for verification link', 'Resend verification email']
        };

      case 'too_many_requests':
        return {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please wait a few minutes before trying again. You can use social sign-in or reset password while waiting.',
          isMobileSpecific: false,
          suggestedActions: ['Wait 5-10 minutes', 'Use Google/Apple sign-in', 'Reset password if needed']
        };

      case 'user_not_found':
        return {
          code: 'USER_NOT_FOUND',
          message: 'Account not found. Please check your email or create a new account.',
          isMobileSpecific: false,
          suggestedActions: ['Check your email address', 'Create a new account']
        };

      default:
        // Handle generic auth errors
        if (errorMessage.toLowerCase().includes('invalid') && errorMessage.toLowerCase().includes('credential')) {
          return {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password. Please double-check your credentials.',
            isMobileSpecific: false,
            suggestedActions: ['Check your email and password', 'Try resetting your password']
          };
        }

        return {
          code: error.code || 'UNKNOWN_ERROR',
          message: errorMessage,
          isMobileSpecific: false,
          suggestedActions: ['Try again', 'Contact support if the issue persists']
        };
    }
  }

  async signOutWithMobileSupport(): Promise<{
    success: boolean;
    error?: MobileAuthError;
  }> {
    try {
      console.log('🚪 Starting mobile-optimized sign out...');

      // Clear storage first
      this.clearAllStorage();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out failed:', error);
        return {
          success: false,
          error: {
            code: 'SIGNOUT_FAILED',
            message: 'Failed to sign out. Please try again.',
            isMobileSpecific: false,
            suggestedActions: ['Try again', 'Clear browser data manually']
          }
        };
      }

      console.log('✅ Sign out successful');
      return { success: true };

    } catch (error: any) {
      console.error('🚨 Unexpected sign out error:', error);
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_SIGNOUT_ERROR',
          message: error.message || 'An unexpected error occurred during sign out',
          isMobileSpecific: false,
          suggestedActions: ['Try again', 'Contact support']
        }
      };
    }
  }

  clearAllStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clear localStorage
      const localKeys = Object.keys(localStorage);
      for (const key of localKeys) {
        if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      }

      // Clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      }

      console.log('🗑️ All auth storage cleared');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  getDeviceInfo(): {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    isWebView: boolean;
    storageAvailable: boolean;
  } {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'server',
        platform: 'server',
        isMobile: false,
        isWebView: false,
        storageAvailable: false
      };
    }

    const storageCheck = this.checkStorageAvailability();
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: this.isMobileBrowser(),
      isWebView: this.isWebView(),
      storageAvailable: storageCheck.localStorage || storageCheck.sessionStorage
    };
  }
}

export const mobileAuthHelper = MobileAuthHelper.getInstance();
