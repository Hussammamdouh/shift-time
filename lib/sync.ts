// Firestore-based sync keyed by SHA-256(passcode) -> roomId (doc id)
// Functions: pullSnapshot, pushSnapshot, subscribeRoom
// Notes: For personal use. Anyone knowing the passcode can derive the same room id.

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, ensureAnonSignIn } from './firebase';
import type { Snapshot } from './types';

// Simple client-side SHA-256
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input.trim());
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function roomIdFromPasscode(code: string) {
  if (!code || !code.trim()) throw new Error('Passcode required');
  return await sha256Hex(code);
}

/** Check if Firebase is available */
function isFirebaseAvailable() {
  return db !== null;
}

/** Pull snapshot from Firestore (if it exists) */
export async function pullSnapshot(passcode: string): Promise<Snapshot | null> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping pull operation');
      return null;
    }
    
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db!, 'rooms', roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data as Snapshot;
  } catch (error) {
    console.error('Pull failed:', error);
    return null;
  }
}

/** Push (upsert) snapshot to Firestore */
export async function pushSnapshot(passcode: string, snapshot: Snapshot): Promise<boolean> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping push operation');
      return false;
    }
    
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db!, 'rooms', roomId);
    await setDoc(ref, snapshot);
    return true;
  } catch (error) {
    console.error('Push failed:', error);
    return false;
  }
}

/** Live subscribe; returns unsubscribe function */
export async function subscribeRoom(passcode: string, callback: (snapshot: Snapshot | null) => void): Promise<() => void> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping subscription');
      return () => {}; // Return no-op unsubscribe function
    }
    
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db!, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Snapshot);
      } else {
        callback(null);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Subscription failed:', error);
    return () => {}; // Return no-op unsubscribe function
  }
}
