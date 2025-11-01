'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Snapshot } from '@/lib/types';
import { loadLocal, saveLocal } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import Stopwatch from './Stopwatch';
import ManualForm from './ManualForm';
import ReportTable from './ReportTable';
import SyncPanel from './SyncPanel';
import Navbar from './Navbar';
import SettingsPanel from './SettingsPanel';
import { PageLoader } from './LoadingSpinner';
import { createDeviceInfo } from '@/lib/deviceUtils';
import { subscribeRoom, pushSnapshot, pullSnapshot } from '@/lib/sync';

const emptySnapshot: Snapshot = {
  schemaVersion: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  watch: { status: 'IDLE', startTimeMs: null, endTimeMs: null, breaks: [], targetMinutes: 420 },
  manual: { breaks: [] },
  history: [],
  prefs: { 
    hourFormat: 24, 
    theme: 'dark', 
    targetMinutes: 420, 
    hourlyRate: 25,
    currency: 'EGP',
    autoSync: true, 
    syncCode: '' 
  }, // syncCode kept for backward compatibility but not used
  devices: [],
  currentDeviceId: undefined,
};

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userProfile, company, signOut } = useAuth();
  const [snap, setSnap] = useState<Snapshot>(() => {
    try { return loadLocal(user?.uid); } catch { return emptySnapshot; }
  });
  
  const initialTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings' || 'watch';
  const [tab, setTab] = useState<'watch' | 'manual' | 'report' | 'sync' | 'settings'>(initialTab);
  const [liveSyncUnsub, setLiveSyncUnsub] = useState<(() => void) | null>(null);
  
  // Use ref to track sync state and prevent infinite loops
  const syncStateRef = useRef({
    lastAutoSync: false,
    isInitialized: false
  });

  useEffect(() => {
    const urlTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings';
    if (urlTab && ['watch', 'manual', 'report', 'sync', 'settings'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  // Load data from Firestore when user first logs in - always pull latest from database
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid && company?.id) {
        try {
          const cloudData = await pullSnapshot(company.id, user.uid);
          if (cloudData) {
            // Use cloud data if it's newer than local, otherwise merge
            if (cloudData.updatedAt > snap.updatedAt || !snap.history.length) {
              setSnap(prevSnap => ({
                ...cloudData,
                currentDeviceId: prevSnap.currentDeviceId, // Preserve current device ID
                devices: [
                  ...(cloudData.devices || []).filter(d => d.id !== prevSnap.currentDeviceId),
                  ...(prevSnap.devices || []).filter(d => d.id === prevSnap.currentDeviceId)
                ]
              }));
              saveLocal(cloudData, user.uid);
            } else {
              // Local is newer, push to cloud
              await pushSnapshot(company.id, user.uid, snap);
            }
          } else {
            // No cloud data exists, push local to cloud
            await pushSnapshot(company.id, user.uid, snap);
          }
        } catch (error) {
          console.error('Failed to load user data from Firestore:', error);
        }
      }
    };
    
    loadUserData();
  }, [user?.uid, company?.id]); // Only run once when user/company is available

  useEffect(() => { 
    if (user?.uid) {
      saveLocal(snap, user.uid); 
    }
  }, [snap, user?.uid]);

  // Initialize device information when app starts
  useEffect(() => {
    if (!snap.currentDeviceId) {
      const deviceInfo = createDeviceInfo();
      setSnap(prevSnap => ({
        ...prevSnap,
        currentDeviceId: deviceInfo.id,
        devices: [deviceInfo],
        updatedAt: Date.now(),
      }));
    }
  }, [snap.currentDeviceId, snap.devices]);

  // Keep device status current
  useEffect(() => {
    if (!snap.currentDeviceId) return;
    
    const interval = setInterval(() => {
      setSnap(prevSnap => {
        if (!prevSnap.devices || !prevSnap.currentDeviceId) return prevSnap;
        
        const updatedDevices = prevSnap.devices.map(device => 
          device.id === prevSnap.currentDeviceId 
            ? { ...device, lastSeen: Date.now(), isOnline: navigator.onLine }
            : device
        );
        
        return {
          ...prevSnap,
          devices: updatedDevices,
          updatedAt: Date.now(),
        };
      });
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [snap.currentDeviceId, snap.devices]);

  // Memoize the sync function to prevent infinite loops
  const startLiveSync = useCallback(async () => {
    const currentAutoSync = snap.prefs.autoSync;
    const companyId = company?.id;
    const userId = user?.uid;
    
    if (!currentAutoSync || !companyId || !userId) {
      // Clean up existing sync if disabled
      if (liveSyncUnsub) {
        liveSyncUnsub();
        setLiveSyncUnsub(null);
      }
      return;
    }

    try {
      // First, push current data to ensure it's available to other devices
      await pushSnapshot(companyId, userId, snap);
      
      // Then start real-time subscription
      const unsubscribe = await subscribeRoom(companyId, userId, (remote) => {
        if (remote && remote.updatedAt > snap.updatedAt) {
          // Only update if remote data is newer
          setSnap(prevSnap => ({
            ...remote,
            currentDeviceId: prevSnap.currentDeviceId, // Preserve current device ID
            devices: [
              ...(remote.devices || []).filter(d => d.id !== prevSnap.currentDeviceId),
              ...(prevSnap.devices || []).filter(d => d.id === prevSnap.currentDeviceId)
            ]
          }));
        }
      });
      
      setLiveSyncUnsub(() => unsubscribe);
    } catch (error) {
      console.error('Auto LiveSync failed:', error);
    }
  }, [snap.prefs.autoSync, snap, liveSyncUnsub, company?.id, user?.uid]);

  // Auto-start LiveSync when autoSync is enabled and user is authenticated
  useEffect(() => {
    const currentAutoSync = snap.prefs.autoSync;
    
    // Only run if sync settings actually changed or user/company changed
    if (syncStateRef.current.lastAutoSync === currentAutoSync &&
        syncStateRef.current.isInitialized &&
        company?.id && user?.uid) {
      return;
    }
    
    // Update ref
    syncStateRef.current.lastAutoSync = currentAutoSync;
    syncStateRef.current.isInitialized = true;

    if (company?.id && user?.uid && currentAutoSync) {
      startLiveSync();
    }

    // Cleanup on unmount
    return () => {
      if (liveSyncUnsub) {
        liveSyncUnsub();
      }
    };
  }, [startLiveSync, liveSyncUnsub, company?.id, user?.uid, snap.prefs.autoSync]); // Clean dependencies

  // Enhanced setSnap that automatically syncs to cloud - always save to database
  const setSnapWithSync = (newSnap: Snapshot | ((prev: Snapshot) => Snapshot)) => {
    setSnap(prevSnap => {
      const updatedSnap = typeof newSnap === 'function' ? newSnap(prevSnap) : newSnap;
      
      // Always sync to cloud when user and company are available - with debouncing to prevent excessive writes
      if (company?.id && user?.uid) {
        // Debounce sync operations to prevent excessive Firestore writes
        setTimeout(async () => {
          try {
            // Only sync if data has actually changed significantly
            const hasSignificantChanges = 
              updatedSnap.updatedAt !== prevSnap.updatedAt ||
              updatedSnap.history.length !== prevSnap.history.length ||
              updatedSnap.watch.status !== prevSnap.watch.status;
            
            if (hasSignificantChanges) {
              await pushSnapshot(company.id, user.uid, updatedSnap);
            }
          } catch (error) {
            console.error('Sync to database failed:', error);
          }
        }, 1000); // Wait 1 second before syncing to batch changes
      }
      
      return updatedSnap;
    });
  };

  function deleteShift(id: string) {
    setSnapWithSync(prevSnap => ({ 
      ...prevSnap, 
      history: prevSnap.history.filter((r) => r.id !== id) 
    }));
  }

  // Calculate statistics for dashboard
  const totalShifts = snap.history.length;
  const totalNetHours = snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000;
  const averageShiftLength = totalShifts > 0 ? totalNetHours / totalShifts : 0;
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const totalEarnings = hourlyRate > 0 ? totalNetHours * hourlyRate : 0;


  const tabConfig = {
    watch: {
      title: 'Stopwatch Dashboard',
      description: 'Track your active work sessions with precision timing',
      icon: '⏱️',
      color: 'from-violet-600 to-cyan-600',
      bgColor: 'from-violet-600/20 to-cyan-600/20',
      borderColor: 'border-violet-500/30',
    },
    manual: {
      title: 'Manual Entry',
      description: 'Add and edit past shift records',
      icon: '📝',
      color: 'from-slate-600 to-slate-700',
      bgColor: 'from-slate-600/20 to-slate-700/20',
      borderColor: 'border-slate-500/30',
    },
    report: {
      title: 'Reports & Analytics',
      description: 'Analyze your time tracking data and generate reports',
      icon: '📊',
      color: 'from-violet-600 to-cyan-600',
      bgColor: 'from-violet-600/20 to-cyan-600/20',
      borderColor: 'border-violet-500/30',
    },
    sync: {
      title: 'Data Synchronization',
      description: 'Keep your data synchronized across all devices',
      icon: '🔄',
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'from-blue-600/20 to-indigo-600/20',
      borderColor: 'border-blue-500/30',
    },
    settings: {
      title: 'Settings & Preferences',
      description: 'Customize your experience and manage preferences',
      icon: '⚙️',
      color: 'from-slate-600 to-slate-700',
      bgColor: 'from-slate-600/20 to-slate-700/20',
      borderColor: 'border-slate-500/30',
    },
  };

  const currentTab = tabConfig[tab];

  return (
    <div className={`min-h-screen ${snap.prefs.compactMode ? 'compact' : ''}`}>
      {/* Enhanced Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Enhanced Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-glow pulse-glow">
                <svg className="w-7 h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold gradient-text-animate ribbon">
                  Shift Tracker
                </h1>
                <p className="text-sm lg:text-base text-slate-400 hidden sm:block">Professional Time Management</p>
              </div>
            </div>

            {/* Enhanced Status Indicators */}
            <div className="flex items-center space-x-6">
              {/* User & Company Info */}
              <div className="hidden sm:flex items-center space-x-3 text-sm">
                {company && (
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border bg-slate-800/50 border-slate-700/50">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span className="text-slate-300 font-medium">{company.name}</span>
                  </div>
                )}
                {userProfile && (
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border bg-slate-800/50 border-slate-700/50">
                    <span className="text-slate-300 text-xs">
                      {userProfile.displayName || userProfile.email}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="hidden sm:flex items-center space-x-3 text-sm">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  snap.prefs.autoSync
                    ? 'bg-emerald-500/20 border-emerald-500/30'
                    : 'bg-slate-500/20 border-slate-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    snap.prefs.autoSync
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-500'
                  }`}></div>
                  <span className={`font-medium ${
                    snap.prefs.autoSync
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                  }`}>
                    {snap.prefs.autoSync ? 'Auto Sync Active' : 'Local Only'}
                  </span>
                </div>
              </div>
              
              {/* Dashboard Button (All Users) */}
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-violet-500/30 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-medium transition-colors duration-200"
                title="Company Dashboard"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden lg:inline">Dashboard</span>
              </a>
              
              {/* Add Employee Button (Admin Only) */}
              {userProfile?.role === 'admin' && (
                <a
                  href="/admin/employees"
                  className="px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium transition-colors duration-200"
                  title="Add Employee"
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden lg:inline">Add Employee</span>
                </a>
              )}
              
              {/* Profile Button */}
              <a
                href="/profile"
                className="px-4 py-2 rounded-lg border border-slate-500/30 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 font-medium transition-colors duration-200"
                title="My Profile"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden lg:inline">Profile</span>
              </a>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  await signOut();
                  router.push('/auth/login');
                }}
                className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-colors duration-200"
                title="Sign Out"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden lg:inline">Sign Out</span>
              </button>
              
              {/* Enhanced Quick Stats */}
              <div className="hidden lg:flex items-center space-x-6">
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                  <span className="text-slate-300 font-medium">Shifts:</span>
                  <span className="font-mono font-bold text-violet-400">{totalShifts}</span>
                </div>
                <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-300 font-medium">Hours:</span>
                  <span className="font-mono font-bold text-emerald-400">{Math.floor(totalNetHours).toString().padStart(2, '0')}:{Math.round((totalNetHours % 1) * 60).toString().padStart(2, '0')}</span>
                </div>
                {hourlyRate > 0 && (
                  <div className="flex items-center space-x-3 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-slate-300 font-medium">Earnings:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {totalEarnings.toFixed(0)} {snap.prefs.currency || 'EGP'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Main Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 pb-28 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Enhanced Left Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-32">
              <div className="space-y-6">
                <Navbar tab={tab} setTab={setTab} />
                
                {/* Enhanced Quick Stats Card */}
                <div className="card space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-700/50">
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-200">Quick Overview</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                      <span className="text-slate-400 text-sm">Today&apos;s Shifts</span>
                      <span className="font-mono font-bold text-slate-200">0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                      <span className="text-slate-400 text-sm">Avg. Length</span>
                      <span className="font-mono font-bold text-slate-200">{Math.round(averageShiftLength * 60)}m</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-violet-500/20 rounded-xl border border-violet-500/30 hover:bg-violet-500/30 transition-colors duration-300">
                      <span className="text-slate-400 text-sm">Daily Target</span>
                      <span className="font-mono font-bold text-violet-400">{snap.prefs.targetMinutes || 420}m</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors duration-300 ${
                      liveSyncUnsub && snap.prefs.autoSync && company?.id && user?.uid
                        ? 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70'
                    }`}>
                      <span className="text-slate-400 text-sm">LiveSync</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          liveSyncUnsub && snap.prefs.autoSync && company?.id && user?.uid
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-500'
                        }`}></div>
                        <span className={`font-mono font-bold ${
                          liveSyncUnsub && snap.prefs.autoSync && company?.id && user?.uid
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}>
                          {liveSyncUnsub && snap.prefs.autoSync && company?.id && user?.uid ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Enhanced Main Content Area */}
          <main className="lg:col-span-3">
            <div className="space-y-8">
              {/* Sync Status Notification */}
              {/* Removed sync message and state as autoSync is removed */}

              {/* Enhanced Page Header */}
              <div className={`card space-y-6 relative overflow-hidden aurora-bg parallax ${
                tab === 'watch' ? 'aurora-accent-watch' :
                tab === 'manual' ? 'aurora-accent-manual' :
                tab === 'report' ? 'aurora-accent-report' :
                tab === 'sync' ? 'aurora-accent-sync' :
                'aurora-accent-settings'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center space-x-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-r ${currentTab.color} shadow-glow`}>
                      {currentTab.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl lg:text-4xl font-bold text-gradient ribbon">
                        {currentTab.title}
                      </h2>
                      <p className="text-slate-400 mt-2 lg:text-lg">
                        {currentTab.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Buttons */}
                  <div className="flex items-center space-x-4">
                    {tab === 'report' && (
                      <button className="btn btn-primary btn-lg">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Data
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Tab Content with Animations */}
              <div className="animate-in fade-in-scale duration-500">
                {tab === 'watch' && <Stopwatch snap={snap} setSnap={setSnapWithSync} />}
                {tab === 'manual' && <ManualForm snap={snap} setSnap={setSnapWithSync} />}
                {tab === 'report' && <ReportTable snap={snap} setSnap={setSnapWithSync} onDelete={deleteShift} />}
                {tab === 'sync' && <SyncPanel snap={snap} setSnap={setSnapWithSync} />}
                {tab === 'settings' && <SettingsPanel snap={snap} setSnap={setSnapWithSync} />}
              </div>
              
              {/* Onboarding Flow */}
              <OnboardingFlow snap={snap} setSnap={setSnapWithSync} />
              
              {/* PWA Install Prompt */}
              <PWARegistration />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AppGate() {
  return (
    <Suspense fallback={<PageLoader text="Preparing your professional dashboard..." />}>
      <HomeContent />
    </Suspense>
  );
}
