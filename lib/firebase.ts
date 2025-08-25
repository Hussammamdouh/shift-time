// Client-only Firebase init (Firestore + Anonymous Auth)
// Usage: import { db, ensureAnonSignIn } from '@/lib/firebase'

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log environment variables (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Firebase Environment Variables:', {
    API_KEY: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
    AUTH_DOMAIN: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
    PROJECT_ID: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
    STORAGE_BUCKET: requiredEnvVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✓ Set' : '✗ Missing',
    MESSAGING_SENDER_ID: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✓ Set' : '✗ Missing',
    APP_ID: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID ? '✓ Set' : '✗ Missing',
  });
}

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars);
  console.error('Please create a .env.local file with your Firebase configuration.');
  console.error('See env.template for required variables.');
  console.error('Firebase features will be disabled until configuration is provided.');
}

// Check if we have all required environment variables
let hasValidConfig = missingVars.length === 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasValidConfig) {
  const firebaseConfig = {
    apiKey: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: requiredEnvVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };

  console.log('Initializing Firebase with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });

  try {
    // Avoid re-initializing on HMR
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    hasValidConfig = false;
  }
} else {
  // Create mock objects when Firebase is not configured
  app = null;
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as unknown as Auth;
  db = null;
}

export { app, auth, db };

/** Ensure there's an anonymous user before any Firestore call */
export async function ensureAnonSignIn() {
  if (!hasValidConfig) {
    console.warn('Firebase not configured. Authentication disabled.');
    return null;
  }
  
  if (!auth?.currentUser) {
    try {
      console.log('Attempting anonymous sign in...');
      await signInAnonymously(auth!);
      console.log('Anonymous sign in successful');
    } catch (error: unknown) {
      console.error('Failed to sign in anonymously:', error);
      
      // Handle specific Firebase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorObj = error as { code?: string };
        if (errorObj.code === 'auth/unauthorized-domain') {
          console.error('Domain not authorized. Add your domain to Firebase Console > Authentication > Settings > Authorized domains');
        } else if (errorObj.code === 'auth/quota-exceeded') {
          console.error('Firebase quota exceeded. Please upgrade your plan.');
        }
      }
      
      return null;
    }
  }
  return auth?.currentUser || null;
}

/** Check if Firebase is available and handle quota errors gracefully */
export function isFirebaseAvailable() {
  return hasValidConfig && app !== null && auth !== null && db !== null;
}

/** Get Firestore with error handling */
export function getFirestoreWithErrorHandling() {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not available. Please check your configuration.');
  }
  return db!;
}

/** Handle Firebase operations with quota error fallback */
export async function withQuotaErrorHandling<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage: string = 'Operation failed due to quota exceeded'
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (isQuotaExceededError(error)) {
      console.error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.warn('Using fallback value due to Firebase quota exceeded');
      return fallback;
    }
    throw error;
  }
}

/** Check if the current error is a quota exceeded error */
export function isQuotaExceededError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const errorObj = error as { code?: string; message?: string };
    return Boolean(
      errorObj.code === 'resource-exhausted' || 
      (errorObj.message && errorObj.message.includes('Quota exceeded')) ||
      (errorObj.message && errorObj.message.includes('quota exceeded'))
    );
  }
  return false;
}
