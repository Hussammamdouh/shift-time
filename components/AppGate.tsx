'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Snapshot } from '@/lib/types';
import { loadLocal, saveLocal } from '@/lib/storage';
import Stopwatch from './Stopwatch';
import ManualForm from './ManualForm';
import ReportTable from './ReportTable';
import SyncPanel from './SyncPanel';
import Navbar from './Navbar';
import SettingsPanel from './SettingsPanel';
import { autoSync } from '@/lib/sync';
import { PageLoader } from './LoadingSpinner';
import { createDeviceInfo } from '@/lib/deviceUtils';

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
    autoSync: false, 
    syncCode: '' 
  },
  devices: [],
  currentDeviceId: undefined,
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<Snapshot>(() => {
    try { return loadLocal(); } catch { return emptySnapshot; }
  });
  
  const initialTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings' || 'watch';
  const [tab, setTab] = useState<'watch' | 'manual' | 'report' | 'sync' | 'settings'>(initialTab);
  const [syncUnsubscribe, setSyncUnsubscribe] = useState<(() => void) | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [showSyncMessage, setShowSyncMessage] = useState(false);

  useEffect(() => {
    const urlTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings';
    if (urlTab && ['watch', 'manual', 'report', 'sync', 'settings'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => { saveLocal(snap); }, [snap]);

  // Initialize device information when app starts
  useEffect(() => {
    if (!snap.currentDeviceId) {
      const deviceInfo = createDeviceInfo();
      setSnap({
        ...snap,
        currentDeviceId: deviceInfo.id,
        devices: [deviceInfo],
        updatedAt: Date.now(),
      });
    }
  }, []);

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

  useEffect(() => {
    const code = (snap.prefs.syncCode || '').trim();
    if (!snap.prefs.autoSync || !code) {
      // Clean up existing sync if disabled
      if (syncUnsubscribe) {
        syncUnsubscribe();
        setSyncUnsubscribe(null);
      }
      return;
    }
    
    const t = setTimeout(async () => {
      try {
        const result = await autoSync(code, snap, setSnap, (error) => {
          console.error('Auto-sync error:', error);
          setSyncMessage(`Sync Error: ${error}`);
          setShowSyncMessage(true);
          setTimeout(() => setShowSyncMessage(false), 5000);
        });
        
        if (result.success) {
          setSyncMessage(result.message);
          setShowSyncMessage(true);
          setTimeout(() => setShowSyncMessage(false), 3000);
          
          if (result.unsubscribe) {
            // Clean up existing sync before setting new one
            if (syncUnsubscribe) {
              syncUnsubscribe();
            }
            setSyncUnsubscribe(() => result.unsubscribe!);
          }
        } else {
          setSyncMessage(result.message);
          setShowSyncMessage(true);
          setTimeout(() => setShowSyncMessage(false), 5000);
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
        setSyncMessage(`Sync Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setShowSyncMessage(true);
        setTimeout(() => setShowSyncMessage(false), 5000);
      }
    }, 500);
    
    return () => clearTimeout(t);
  }, [snap.prefs.autoSync, snap.prefs.syncCode, snap, syncUnsubscribe]);

  // Clean up sync when component unmounts
  useEffect(() => {
    return () => {
      if (syncUnsubscribe) {
        syncUnsubscribe();
      }
    };
  }, [syncUnsubscribe]);

  function deleteShift(id: string) {
    setSnap({ ...snap, history: snap.history.filter((r) => r.id !== id) });
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
    <div className="min-h-screen">
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
                <h1 className="text-2xl lg:text-3xl font-bold gradient-text-animate">
                  Shift Tracker
                </h1>
                <p className="text-sm lg:text-base text-slate-400 hidden sm:block">Professional Time Management</p>
              </div>
            </div>

            {/* Enhanced Status Indicators */}
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-3 text-sm">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  syncUnsubscribe && snap.prefs.autoSync
                    ? 'bg-emerald-500/20 border-emerald-500/30'
                    : 'bg-slate-500/20 border-slate-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    syncUnsubscribe && snap.prefs.autoSync
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-500'
                  }`}></div>
                  <span className={`font-medium ${
                    syncUnsubscribe && snap.prefs.autoSync
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                  }`}>
                    {syncUnsubscribe && snap.prefs.autoSync ? 'Auto Sync Active' : 'Local Only'}
                  </span>
                </div>
              </div>
              
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
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
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Enhanced Main Content Area */}
          <main className="lg:col-span-3">
            <div className="space-y-8">
              {/* Sync Status Notification */}
              {showSyncMessage && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <div className="card bg-blue-500/20 border border-blue-500/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-blue-300 font-medium">{syncMessage}</p>
                      </div>
                      <button 
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={() => setShowSyncMessage(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Page Header */}
              <div className="card space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center space-x-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-r ${currentTab.color} shadow-glow`}>
                      {currentTab.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl lg:text-4xl font-bold text-gradient">
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
                {tab === 'watch' && <Stopwatch snap={snap} setSnap={setSnap} />}
                {tab === 'manual' && <ManualForm snap={snap} setSnap={setSnap} />}
                {tab === 'report' && <ReportTable snap={snap} setSnap={setSnap} onDelete={deleteShift} />}
                {tab === 'sync' && <SyncPanel snap={snap} setSnap={setSnap} />}
                {tab === 'settings' && <SettingsPanel snap={snap} setSnap={setSnap} />}
              </div>
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
