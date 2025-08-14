// Firestore-based sync keyed by SHA-256(passcode) -> roomId (doc id)
// Functions: pullSnapshot, pushSnapshot, subscribeRoom
// Notes: For personal use. Anyone knowing the passcode can derive the same room id.

import { db, ensureAnonSignIn } from './firebase';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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
  if (!isFirebaseAvailable()) {
    console.warn('Firebase not configured. Pull operation skipped.');
    return null;
  }
  
  try {
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db, 'rooms', roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return (data.snapshot as Snapshot) ?? null;
  } catch (error) {
    console.error('Failed to pull snapshot:', error);
    return null;
  }
}

/** Push (upsert) snapshot to Firestore */
export async function pushSnapshot(passcode: string, snapshot: Snapshot): Promise<void> {
  if (!isFirebaseAvailable()) {
    console.warn('Firebase not configured. Push operation skipped.');
    return;
  }
  
  try {
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db, 'rooms', roomId);

    // Last-write-wins; you can add merge logic if needed
    const toStore = {
      snapshot: { ...snapshot, updatedAt: Date.now() },
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, toStore, { merge: true });
  } catch (error) {
    console.error('Failed to push snapshot:', error);
    throw error;
  }
}

/** Live subscribe; returns unsubscribe function */
export async function subscribeRoom(
  passcode: string,
  cb: (remote: Snapshot | null) => void
): Promise<() => void> {
  if (!isFirebaseAvailable()) {
    console.warn('Firebase not configured. Live sync disabled.');
    // Return a no-op unsubscribe function
    return () => {};
  }
  
  try {
    await ensureAnonSignIn();
    const roomId = await roomIdFromPasscode(passcode);
    const ref = doc(db, 'rooms', roomId);
    return onSnapshot(ref, (d) => {
      if (!d.exists()) return cb(null);
      const data = d.data();
      cb((data.snapshot as Snapshot) ?? null);
    });
  } catch (error) {
    console.error('Failed to subscribe to room:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
}
