'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import DevicePanel from './DevicePanel';

export default function SyncPanel({ snap, setSnap }: { snap: Snapshot; setSnap: (s: Snapshot) => void }) {
  const { user, company } = useAuth();
  const [status, setStatus] = useState('Checking status...');

  // Check if Firebase is configured
  const isFirebaseConfigured = db !== null;

  useEffect(() => {
    // Update status based on current state
    if (!isFirebaseConfigured) {
      setStatus('Firebase not configured');
    } else if (!user || !company) {
      setStatus('Not authenticated');
    } else if (snap.prefs.autoSync) {
      setStatus('Auto Sync Active ✓');
    } else {
      setStatus('Auto Sync Disabled');
    }
  }, [isFirebaseConfigured, user, company, snap.prefs.autoSync]);

  function toggleAutoSync() {
    setSnap({
      ...snap,
      prefs: {
        ...snap.prefs,
        autoSync: !snap.prefs.autoSync,
      },
    });
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="card space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-glow">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-200">LiveSync</h2>
            <p className="text-slate-400">Real-time synchronization across all your devices</p>
          </div>
        </div>
      </div>

      {/* Firebase Configuration Warning */}
      {!isFirebaseConfigured && (
        <div className="card space-y-4 bg-yellow-500/20 border border-yellow-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-yellow-400 font-semibold text-lg">Firebase Not Configured</div>
              <div className="text-sm text-yellow-300">
                LiveSync is currently disabled. Configure Firebase to enable cross-device synchronization.
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
            <div className="text-sm text-yellow-400 font-medium mb-2">To enable LiveSync:</div>
            <ol className="text-xs text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Create a <code className="bg-yellow-500/20 px-1 rounded">.env.local</code> file in your project root</li>
              <li>Add your Firebase configuration variables (see <code className="bg-yellow-500/20 px-1 rounded">env.template</code>)</li>
              <li>Restart your development server</li>
            </ol>
          </div>
        </div>
      )}

      {/* LiveSync Controls */}
      <div className="card space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Auto Sync Configuration</h3>
            <p className="text-sm text-slate-400">Automatically sync your data across all devices</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                snap.prefs.autoSync
                  ? 'bg-emerald-500/20 border-2 border-emerald-500/30'
                  : 'bg-slate-700/50 border-2 border-slate-600/50'
              }`}>
                <svg className={`w-6 h-6 ${snap.prefs.autoSync ? 'text-emerald-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-200">Auto Sync</h4>
                <p className="text-sm text-slate-400">
                  {snap.prefs.autoSync 
                    ? 'Your data automatically syncs to the cloud and across devices' 
                    : 'Enable to automatically sync your data across all devices'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAutoSync}
              disabled={!isFirebaseConfigured || !user || !company}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                snap.prefs.autoSync ? 'bg-emerald-500' : 'bg-slate-600'
              } ${(!isFirebaseConfigured || !user || !company) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  snap.prefs.autoSync ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Info Box */}
          <div className="text-xs text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <div className="font-medium mb-1 text-slate-300">ℹ️ How Auto Sync Works:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Your data is securely stored in Firebase Firestore</li>
              <li>Real-time synchronization across all your devices</li>
              <li>Data is automatically saved and synced when changes occur</li>
              <li>Only your account has access to your data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Enhanced Status Display */}
      <div className="card space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">LiveSync Status</h3>
            <p className="text-sm text-slate-400">Current synchronization status and information</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <span className={`px-6 py-3 rounded-full text-lg font-medium ${
              status.includes('✓') 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : status.includes('failed') || status.includes('not configured')
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : status.includes('…') || status.includes('Connecting')
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {status}
            </span>
          </div>

          {/* Technical Details */}
          <div className="text-xs text-slate-500 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-2">
            <div className="font-medium text-slate-400 mb-2">🔧 Technical Details:</div>
            <div className="space-y-1">
              <div>• <strong>Storage Path:</strong> companies/{company?.id}/users/{user?.uid}/data</div>
              <div>• <strong>Security:</strong> Firebase rules ensure only authenticated users can access their data</div>
              <div>• <strong>Encryption:</strong> All data is encrypted in transit using HTTPS</div>
              <div>• <strong>Real-time:</strong> Auto Sync uses Firestore real-time listeners</div>
              <div>• <strong>Cross-device:</strong> Changes sync instantly across all connected devices</div>
            </div>
          </div>

          {/* Connection Info */}
          {snap.prefs.autoSync && user && company && (
            <div className="text-center p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <div className="flex items-center justify-center space-x-2 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">Auto Sync Active</span>
              </div>
              <p className="text-xs text-emerald-300 mt-1">
                Your data is automatically syncing in real-time across all your devices
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Device Management Panel */}
      <DevicePanel snap={snap} />
    </div>
  );
}
