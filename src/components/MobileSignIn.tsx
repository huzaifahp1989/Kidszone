"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mobileAuthHelper, MobileAuthError } from '@/lib/mobile-auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/Button';

interface MobileSignInProps {
  onSuccess?: () => void;
  className?: string;
}

export function MobileSignIn({ onSuccess, className = "" }: MobileSignInProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // Detect mobile device and get device info
    const mobile = mobileAuthHelper.isMobileBrowser();
    const info = mobileAuthHelper.getDeviceInfo();
    setIsMobile(mobile);
    setDeviceInfo(info);
    
    console.log('📱 Mobile SignIn Device Info:', info);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔐 Mobile SignIn: Attempting sign in for:', email);
      
      // Use mobile-optimized auth helper
      const result = await mobileAuthHelper.signInWithMobileSupport(email, password);
      
      if (!result.success) {
        const authError = result.error as MobileAuthError;
        console.error('❌ Mobile SignIn failed:', authError);
        
        // Handle mobile-specific errors with detailed messages
        if (authError.isMobileSpecific) {
          const suggestions = authError.suggestedActions.map(action => `• ${action}`).join('\n');
          setError(`${authError.message}\n\nSuggestions:\n${suggestions}`);
        } else {
          setError(authError.message);
        }
        return;
      }
      
      if (!result.user?.id) {
        throw new Error('Sign-in succeeded but no user ID returned');
      }

      console.log('✅ Mobile SignIn successful, user ID:', result.user.id);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Small delay to ensure auth state is properly updated
        setTimeout(() => {
          router.push('/');
        }, 100);
      }
      
    } catch (err: any) {
      console.error('🚨 Mobile SignIn unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearStorage = async () => {
    try {
      mobileAuthHelper.clearAllStorage();
      setInfo('Storage cleared. Please try signing in again.');
      setError(null);
    } catch (err) {
      console.error('Error clearing storage:', err);
      setError('Failed to clear storage. Please try refreshing the page.');
    }
  };

  const handleForgotPassword = async () => {
    try {
      setError(null);
      setInfo(null);
      if (!email.trim()) {
        setError('Please enter your email above, then tap “Forgot password?” again.');
        return;
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (resetErr) {
        console.error('Reset email error:', resetErr);
        setError(resetErr.message || 'Could not send reset email. Please try again.');
        return;
      }
      setInfo('Password reset email sent. Please check your inbox and open the link here.');
    } catch (e: any) {
      console.error('Reset email exception:', e);
      setError(e?.message || 'Could not send reset email. Please try again.');
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm sm:text-base">Sign in to continue learning</p>
        </div>

        {/* Mobile Device Detection Notice */}
        {isMobile && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-blue-600 mr-2">📱</span>
              <span className="text-blue-800 font-medium text-sm">Mobile Device Detected</span>
            </div>
            <p className="text-blue-800 text-xs mb-2">
              We've optimized this sign-in for your mobile device.
            </p>
            <button
              onClick={() => setShowDeviceInfo(!showDeviceInfo)}
              className="text-blue-600 text-xs hover:text-blue-800 underline"
            >
              {showDeviceInfo ? 'Hide' : 'Show'} Device Info
            </button>
            
            {showDeviceInfo && deviceInfo && (
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <div><strong>Platform:</strong> {deviceInfo.platform}</div>
                <div><strong>Storage:</strong> {deviceInfo.storageAvailable ? 'Available' : 'Not Available'}</div>
                <div><strong>WebView:</strong> {deviceInfo.isWebView ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Troubleshooting */}
        {isMobile && (
          <div className="mb-4 rounded-lg bg-blue-50 text-blue-700 px-4 py-3 text-sm">
            <strong>📱 Mobile Tip:</strong> If you're having trouble signing in, try:
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Enable cookies and local storage in your browser settings</li>
              <li>Try using Chrome or Safari browser</li>
              <li>Make sure you have a stable internet connection</li>
              <li>Disable private/incognito mode if enabled</li>
            </ul>
            <button
              onClick={handleClearStorage}
              className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              Clear Storage & Retry
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue focus:border-transparent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue focus:border-transparent transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              className="mt-2 text-xs text-islamic-blue font-semibold hover:underline focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 text-base font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          <p className="text-sm text-center text-gray-600">
            New here?{' '}
            <Link href="/signup" className="text-islamic-blue font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        {/* Debug Information */}
        {debugMode && deviceInfo && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <div className="space-y-1">
              <div><strong>User Agent:</strong> {deviceInfo.userAgent}</div>
              <div><strong>Platform:</strong> {deviceInfo.platform}</div>
              <div><strong>Cookies Enabled:</strong> {typeof window !== 'undefined' ? navigator.cookieEnabled ? 'Yes' : 'No' : 'N/A'}</div>
              <div><strong>LocalStorage Available:</strong> {deviceInfo.storageAvailable ? 'Yes' : 'No'}</div>
              <div><strong>WebView:</strong> {deviceInfo.isWebView ? 'Yes' : 'No'}</div>
            </div>
            <button
              onClick={() => setDebugMode(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Hide Debug Info
            </button>
          </div>
        )}

        {!debugMode && (
          <button
            onClick={() => setDebugMode(true)}
            className="mt-4 text-xs text-gray-600 hover:text-gray-700"
          >
            Show Debug Info
          </button>
        )}
      </div>
    </div>
  );
}
