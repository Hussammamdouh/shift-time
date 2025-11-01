// Firestore-based sync for user-specific data
// Functions: pullSnapshot, pushSnapshot, subscribeRoom, autoSync
// Notes: Data is stored per user in companies/{companyId}/users/{userId}/data

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Snapshot, DeviceInfo } from './types';
import { createDeviceInfo, isDeviceActive } from './deviceUtils';

/** Check if Firebase is available */
function isFirebaseAvailable() {
  return db !== null;
}

// Debouncing mechanism to prevent excessive writes
const syncDebounceMap = new Map<string, NodeJS.Timeout>();

/** Pull snapshot from Firestore (if it exists) */
export async function pullSnapshot(companyId: string, userId: string): Promise<Snapshot | null> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping pull operation');
      return null;
    }
    
    if (!companyId || !userId) {
      console.warn('Company ID and User ID are required');
      return null;
    }
    
    const ref = doc(db!, 'companies', companyId, 'users', userId, 'data', 'snapshot');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data as Snapshot;
  } catch (error) {
    console.error('Pull failed:', error);
    return null;
  }
}

/** Push (upsert) snapshot to Firestore with debouncing */
export async function pushSnapshot(companyId: string, userId: string, snapshot: Snapshot): Promise<boolean> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping push operation');
      return false;
    }
    
    if (!companyId || !userId) {
      console.warn('Company ID and User ID are required');
      return false;
    }
    
    // Debounce rapid successive calls to prevent excessive writes
    const syncKey = `${companyId}:${userId}`;
    const existingTimeout = syncDebounceMap.get(syncKey);
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set a new timeout for the actual write
    const timeoutId = setTimeout(async () => {
      try {
        const ref = doc(db!, 'companies', companyId, 'users', userId, 'data', 'snapshot');
        await setDoc(ref, snapshot);
        console.log('Snapshot synced to Firestore successfully');
      } catch (error) {
        console.error('Debounced push failed:', error);
      } finally {
        syncDebounceMap.delete(syncKey);
      }
    }, 2000); // Wait 2 seconds before writing to batch rapid changes
    
    syncDebounceMap.set(syncKey, timeoutId);
    return true;
  } catch (error) {
    console.error('Push failed:', error);
    return false;
  }
}

/** Live subscribe; returns unsubscribe function */
export async function subscribeRoom(
  companyId: string, 
  userId: string, 
  callback: (snapshot: Snapshot | null) => void
): Promise<() => void> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping subscription');
      return () => {}; // Return no-op unsubscribe function
    }
    
    if (!companyId || !userId) {
      console.warn('Company ID and User ID are required');
      return () => {};
    }
    
    const ref = doc(db!, 'companies', companyId, 'users', userId, 'data', 'snapshot');
    
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

/** Automatic sync function that pulls latest data and sets up real-time sync */
export async function autoSync(
  companyId: string,
  userId: string,
  currentSnapshot: Snapshot,
  onSnapshotUpdate: (snapshot: Snapshot) => void,
  onError?: (error: string) => void
): Promise<{ success: boolean; message: string; unsubscribe?: () => void }> {
  try {
    if (!isFirebaseAvailable()) {
      const message = 'Firebase not configured, sync disabled';
      onError?.(message);
      return { success: false, message };
    }

    if (!companyId || !userId) {
      const message = 'Company ID and User ID are required for sync';
      onError?.(message);
      return { success: false, message };
    }

    // Create or update current device info
    const currentDevice = createDeviceInfo();
    const updatedSnapshot = {
      ...currentSnapshot,
      currentDeviceId: currentDevice.id,
      devices: [
        ...(currentSnapshot.devices || []).filter(d => d.id !== currentDevice.id),
        currentDevice
      ]
    };

    // First, pull the latest data from the cloud
    const cloudSnapshot = await pullSnapshot(companyId, userId);
    
    if (cloudSnapshot) {
      // If cloud data exists, check if it's newer than local data
      if (cloudSnapshot.updatedAt > currentSnapshot.updatedAt) {
        // Cloud data is newer, update local data
        const mergedSnapshot = {
          ...cloudSnapshot,
          currentDeviceId: currentDevice.id,
          devices: [
            ...(cloudSnapshot.devices || []).filter(d => d.id !== currentDevice.id),
            currentDevice
          ]
        };
        
        onSnapshotUpdate(mergedSnapshot);
        
        // Set up real-time sync for future updates
        const unsubscribe = await subscribeRoom(companyId, userId, (newSnapshot) => {
          if (newSnapshot && newSnapshot.updatedAt > currentSnapshot.updatedAt) {
            const mergedSnapshot = {
              ...newSnapshot,
              currentDeviceId: currentDevice.id,
              devices: [
                ...(newSnapshot.devices || []).filter(d => d.id !== currentDevice.id),
                currentDevice
              ]
            };
            onSnapshotUpdate(mergedSnapshot);
          }
        });
        
        return { 
          success: true, 
          message: `Synced with cloud data from ${getDeviceSummary(cloudSnapshot.devices || [])} and enabled real-time sync`, 
          unsubscribe 
        };
      } else {
        // Local data is newer or same, push local data to cloud
        await pushSnapshot(companyId, userId, updatedSnapshot);
        
        // Set up real-time sync
        const unsubscribe = await subscribeRoom(companyId, userId, (newSnapshot) => {
          if (newSnapshot && newSnapshot.updatedAt > currentSnapshot.updatedAt) {
            const mergedSnapshot = {
              ...newSnapshot,
              currentDeviceId: currentDevice.id,
              devices: [
                ...(newSnapshot.devices || []).filter(d => d.id !== currentDevice.id),
                currentDevice
              ]
            };
            onSnapshotUpdate(mergedSnapshot);
          }
        });
        
        return { 
          success: true, 
          message: `Local data pushed to cloud and enabled real-time sync. Other devices: ${getDeviceSummary(cloudSnapshot.devices || [])}`, 
          unsubscribe 
        };
      }
    } else {
      // No cloud data exists, push local data and set up sync
      await pushSnapshot(companyId, userId, updatedSnapshot);
      
      // Set up real-time sync
      const unsubscribe = await subscribeRoom(companyId, userId, (newSnapshot) => {
        if (newSnapshot && newSnapshot.updatedAt > currentSnapshot.updatedAt) {
          const mergedSnapshot = {
            ...newSnapshot,
            currentDeviceId: currentDevice.id,
            devices: [
              ...(newSnapshot.devices || []).filter(d => d.id !== currentDevice.id),
              currentDevice
            ]
          };
          onSnapshotUpdate(mergedSnapshot);
        }
      });
      
      return { 
        success: true, 
        message: 'Local data uploaded to cloud and enabled real-time sync. Waiting for other devices...', 
        unsubscribe 
      };
    }
  } catch (error) {
    const message = `Auto-sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onError?.(message);
    return { success: false, message };
  }
}

/**
 * Get a summary of other devices for display
 */
function getDeviceSummary(devices: DeviceInfo[]): string {
  const otherDevices = devices.filter(d => isDeviceActive(d));
  
  if (otherDevices.length === 0) {
    return 'No other devices';
  }
  
  const deviceTypes = otherDevices.map(d => d.type);
  const uniqueTypes = [...new Set(deviceTypes)];
  
  if (uniqueTypes.length === 1) {
    const count = otherDevices.length;
    const type = uniqueTypes[0];
    return `${count} ${type}${count > 1 ? 's' : ''}`;
  }
  
  return `${otherDevices.length} devices`;
}
