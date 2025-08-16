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
import { pushSnapshot } from '@/lib/sync';

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
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<Snapshot>(() => {
    try { return loadLocal(); } catch { return emptySnapshot; }
  });
  
  const initialTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings' || 'watch';
  const [tab, setTab] = useState<'watch' | 'manual' | 'report' | 'sync' | 'settings'>(initialTab);

  useEffect(() => {
    const urlTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings';
    if (urlTab && ['watch', 'manual', 'report', 'sync', 'settings'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => { saveLocal(snap); }, [snap]);

  useEffect(() => {
    const code = (snap.prefs.syncCode || '').trim();
    if (!snap.prefs.autoSync || !code) return;
    const t = setTimeout(() => { pushSnapshot(code, snap).catch(()=>{}); }, 500);
    return () => clearTimeout(t);
  }, [snap]);

  function deleteShift(id: string) {
    setSnap({ ...snap, history: snap.history.filter((r) => r.id !== id) });
  }

  // Calculate statistics for dashboard
  const totalShifts = snap.history.length;
  const totalNetHours = snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000;
  const totalBreakTime = snap.history.reduce((a, r) => a + r.breakMs, 0) / 3600000;
  const averageShiftLength = totalShifts > 0 ? totalNetHours / totalShifts : 0;
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const totalEarnings = hourlyRate > 0 ? totalNetHours * hourlyRate : 0;

  const tabConfig = {
    watch: {
      title: 'Stopwatch Dashboard',
      description: 'Track your active work sessions with precision timing',
      icon: '⏱️',
      color: 'from-violet-600 to-cyan-600',
    },
    manual: {
      title: 'Manual Entry',
      description: 'Add and edit past shift records',
      icon: '📝',
      color: 'from-slate-600 to-slate-700',
    },
    report: {
      title: 'Reports & Analytics',
      description: 'Analyze your time tracking data and generate reports',
      icon: '📊',
      color: 'from-violet-600 to-cyan-600',
    },
    sync: {
      title: 'Data Synchronization',
      description: 'Keep your data synchronized across all devices',
      icon: '🔄',
      color: 'from-blue-600 to-indigo-600',
    },
    settings: {
      title: 'Settings & Preferences',
      description: 'Customize your experience and manage preferences',
      icon: '⚙️',
      color: 'from-slate-600 to-slate-700',
    },
  };

  const currentTab = tabConfig[tab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gradient">
                  Shift Tracker
                </h1>
                <p className="text-xs lg:text-sm text-slate-400 hidden sm:block">Professional Time Management</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Local-first + Firebase sync</span>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Total Shifts:</span>
                  <span className="font-mono font-semibold text-violet-400">{totalShifts}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Total Hours:</span>
                  <span className="font-mono font-semibold text-emerald-400">{totalNetHours.toFixed(2)}h</span>
                </div>
                {hourlyRate > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Total Earnings:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {totalEarnings.toFixed(2)} {snap.prefs.currency || 'EGP'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Left Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="card space-y-6">
                <Navbar tab={tab} setTab={setTab} />
                
                {/* Quick Stats Card */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Shifts Today:</span>
                      <span className="font-mono text-slate-200">0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Avg. Length:</span>
                      <span className="font-mono text-slate-200">{Math.round(averageShiftLength * 60)}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-mono text-slate-200">{snap.prefs.targetMinutes || 420}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3">
            <div className="space-y-8">
              {/* Page Header */}
              <div className="card space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-r ${currentTab.color}`}>
                      {currentTab.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gradient">
                        {currentTab.title}
                      </h2>
                      <p className="text-slate-400 mt-1 lg:text-lg">
                        {currentTab.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    {tab === 'report' && (
                      <button className="btn btn-primary">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Data
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="animate-in fade-in duration-300">
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-8">
          <div className="w-24 h-24 mx-auto border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gradient">Loading Shift Tracker</h2>
            <p className="text-slate-400 text-lg">Preparing your professional dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
