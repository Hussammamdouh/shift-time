'use client';
import { useEffect, useState } from 'react';
import LockScreen from './LockScreen';
import { isLockEnabled } from '@/lib/passcode';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const [needsLock, setNeedsLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    // Check if lock is enabled
    setNeedsLock(isLockEnabled());
    
    // Check Firebase connection
    const checkFirebase = async () => {
      try {
        // Try to import Firebase to check if it's properly configured
        const { app } = await import('@/lib/firebase');
        if (!app) {
          setFirebaseError('Firebase not initialized');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Firebase configuration error';
        setFirebaseError(errorMessage);
      }
    };
    
    checkFirebase();
  }, []);

  // Show Firebase error if there's a configuration issue
  if (firebaseError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full card-elevated text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-400">Configuration Error</h1>
            <p className="text-gray-300">{firebaseError}</p>
          </div>
          
          <div className="text-left space-y-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-sm font-medium text-gray-200">Please check your Firebase configuration:</p>
            <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1 ml-2">
              <li>Copy env.template to .env.local</li>
              <li>Fill in your Firebase project details</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (needsLock && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(156,146,172,0.02)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
