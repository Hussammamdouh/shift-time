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
    AUTH_DOMAIN: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing',
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
    } catch (error) {
      console.error('Failed to sign in anonymously:', error);
      return null;
    }
  }
  return auth?.currentUser || null;
}
