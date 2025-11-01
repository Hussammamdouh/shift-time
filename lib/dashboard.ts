// Dashboard functions for querying company users and their data

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { pullSnapshot } from './sync';
import type { Snapshot } from './types';
import type { UserProfile } from './auth';

export interface UserDashboardData {
  profile: UserProfile;
  snapshot: Snapshot | null;
  currentStatus: 'WORKING' | 'ON_BREAK' | 'IDLE' | 'UNKNOWN';
  totalHours: number;
  totalShifts: number;
  totalEarnings: number;
  lastActive?: number;
}

/**
 * Get all users in a company
 */
export async function getCompanyUsers(companyId: string): Promise<UserProfile[]> {
  if (!db || !companyId) {
    console.warn('Firebase not configured or company ID missing');
    return [];
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('companyId', '==', companyId));
    const querySnapshot = await getDocs(q);
    
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching company users:', error);
    return [];
  }
}

/**
 * Get dashboard data for all users in a company
 */
export async function getCompanyDashboardData(companyId: string): Promise<UserDashboardData[]> {
  const users = await getCompanyUsers(companyId);
  
  const dashboardData = await Promise.all(
    users.map(async (user): Promise<UserDashboardData> => {
      // Get user's snapshot
      const snapshot = await pullSnapshot(companyId, user.uid);
      
      // Determine current status
      let currentStatus: 'WORKING' | 'ON_BREAK' | 'IDLE' | 'UNKNOWN' = 'UNKNOWN';
      if (snapshot) {
        currentStatus = snapshot.watch.status;
      }
      
      // Calculate totals
      const totalShifts = snapshot?.history?.length || 0;
      const totalHours = (snapshot?.history?.reduce((sum, shift) => sum + shift.netMs, 0) || 0) / 3600000;
      const hourlyRate = snapshot?.prefs.hourlyRate || 0;
      const totalEarnings = totalHours * hourlyRate;
      
      // Get last active time
      const lastActive = snapshot?.updatedAt;
      
      return {
        profile: user,
        snapshot,
        currentStatus,
        totalHours,
        totalShifts,
        totalEarnings,
        lastActive,
      };
    })
  );
  
  return dashboardData;
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours % 1) * 60);
  return `${h}h ${m}m`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    // Fallback for non-standard currency codes
    return `${amount.toFixed(2)} ${currency}`;
  }
}

