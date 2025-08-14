'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Snapshot } from '@/lib/types';
import { loadLocal, saveLocal } from '@/lib/storage';
import Stopwatch from '@/components/Stopwatch';
import ManualForm from '@/components/ManualForm';
import ReportTable from '@/components/ReportTable';
import SyncPanel from '@/components/SyncPanel';
import Navbar from '@/components/Navbar';
import SettingsPanel from '@/components/SettingsPanel';
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
    hourlyRate: 25, // Default hourly rate
    currency: 'USD', // Default currency
    autoSync: false, 
    syncCode: '' 
  },
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<Snapshot>(() => {
    try { return loadLocal(); } catch { return emptySnapshot; }
  });
  
  // Initialize tab from URL params or default to 'watch'
  const initialTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings' || 'watch';
  const [tab, setTab] = useState<'watch' | 'manual' | 'report' | 'sync' | 'settings'>(initialTab);

  // Update tab when URL params change
  useEffect(() => {
    const urlTab = searchParams.get('tab') as 'watch' | 'manual' | 'report' | 'sync' | 'settings';
    if (urlTab && ['watch', 'manual', 'report', 'sync', 'settings'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  // Persist locally
  useEffect(() => { saveLocal(snap); }, [snap]);

  // Auto-push sync on local change
  useEffect(() => {
    const code = (snap.prefs.syncCode || '').trim();
    if (!snap.prefs.autoSync || !code) return;
    // debounce a bit to avoid spamming
    const t = setTimeout(() => { pushSnapshot(code, snap).catch(()=>{}); }, 500);
    return () => clearTimeout(t);
  }, [snap]);

  function deleteShift(id: string) {
    setSnap({ ...snap, history: snap.history.filter((r) => r.id !== id) });
  }

  // Calculate statistics for dashboard
  const totalShifts = snap.history.length;
  const totalHours = Math.floor(snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000);
  const totalMinutes = Math.floor(snap.history.reduce((a, r) => a + r.netMs, 0) / 60000);
  const averageShiftLength = totalShifts > 0 ? Math.floor(totalMinutes / totalShifts) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-purple-500 rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Shift Tracker
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">Professional Time Management</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Local-first + Firebase sync</span>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Total Shifts:</span>
                  <span className="font-mono font-semibold text-brand-primary">{totalShifts}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Total Hours:</span>
                  <span className="font-mono font-semibold text-green-400">{totalHours.toFixed(1)}h</span>
                </div>
                {snap.prefs.hourlyRate && snap.prefs.hourlyRate > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Total Earnings:</span>
                    <span className="font-mono font-semibold text-green-400">
                      {(totalHours * snap.prefs.hourlyRate).toFixed(2)} {snap.prefs.currency || 'USD'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="card space-y-4">
                <div className="text-center pb-4 border-b border-gray-800/50">
                  <h2 className="text-lg font-semibold text-gray-200">Navigation</h2>
                  <p className="text-sm text-gray-400">Quick access to features</p>
                </div>
                
                <Navbar tab={tab} setTab={setTab} />
                
                {/* Quick Stats Card */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Overview</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Shifts Today:</span>
                      <span className="font-mono text-gray-200">0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg. Length:</span>
                      <span className="font-mono text-gray-200">{averageShiftLength}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Target:</span>
                      <span className="font-mono text-gray-200">{snap.prefs.targetMinutes || 420}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {/* Page Header */}
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                      {tab === 'watch' && 'Stopwatch Dashboard'}
                      {tab === 'manual' && 'Manual Entry'}
                      {tab === 'report' && 'Reports & Analytics'}
                      {tab === 'sync' && 'Data Synchronization'}
                      {tab === 'settings' && 'Settings & Preferences'}
                    </h2>
                    <p className="text-gray-400 mt-1">
                      {tab === 'watch' && 'Track your active work sessions with precision timing'}
                      {tab === 'manual' && 'Add and edit past shift records'}
                      {tab === 'report' && 'Analyze your time tracking data and generate reports'}
                      {tab === 'sync' && 'Keep your data synchronized across all devices'}
                      {tab === 'settings' && 'Customize your experience and manage preferences'}
                    </p>
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
              <div className="animate-fade-in">
                {tab === 'watch' && <Stopwatch snap={snap} setSnap={setSnap} />}
                {tab === 'manual' && <ManualForm snap={snap} setSnap={setSnap} />}
                {tab === 'report' && <ReportTable snap={snap} setSnap={setSnap} onDelete={deleteShift} />}
                {tab === 'sync' && <SyncPanel snap={snap} setSnap={setSnap} />}
                {tab === 'settings' && <SettingsPanel snap={snap} setSnap={setSnap} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-200">Loading Shift Tracker</h2>
            <p className="text-gray-400">Preparing your professional dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
