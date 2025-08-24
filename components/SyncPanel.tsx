'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { subscribeRoom, pushSnapshot } from '@/lib/sync';
import { db } from '@/lib/firebase';
import DevicePanel from './DevicePanel';

export default function SyncPanel({ snap, setSnap }: { snap: Snapshot; setSnap: (s: Snapshot) => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('—');
  const [unsub, setUnsub] = useState<null | (() => void)>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Firebase is configured
  const isFirebaseConfigured = db !== null;

  useEffect(() => () => { unsub?.(); }, [unsub]);

  async function startLiveSync() {
    if (!isFirebaseConfigured) {
      setStatus('Firebase not configured');
      return;
    }
    
    if (!code.trim()) {
      setStatus('Please enter a sync passcode');
      return;
    }

    setIsConnecting(true);
    setStatus('Connecting to LiveSync...');
    
    try {
      // First, push current data to ensure it's available to other devices
      await pushSnapshot(code, snap);
      
      // Then start real-time subscription
      const unsubscribe = await subscribeRoom(code, (remote) => {
        if (remote) { 
          setSnap(remote); 
          setStatus('LiveSync Active ✓'); 
        }
      });
      
      setUnsub(() => unsubscribe);
      setStatus('LiveSync Active ✓');
    } catch (error) {
      setStatus('LiveSync failed');
      console.error('LiveSync error:', error);
    } finally {
      setIsConnecting(false);
    }
  }

  function stopLiveSync() {
    if (unsub) {
      unsub(); 
      setUnsub(null); 
      setStatus('LiveSync stopped');
    }
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
            <h3 className="text-lg font-semibold text-slate-200">LiveSync Configuration</h3>
            <p className="text-sm text-slate-400">Enter your sync passcode to start real-time synchronization</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Sync Passcode</span>
            </label>
            <input 
              className="input w-full text-lg" 
              placeholder="Enter your 4-digit sync code (e.g. 4937)" 
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              disabled={!isFirebaseConfigured}
              maxLength={8}
            />
            <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="font-medium mb-1">🔐 Security Note:</div>
              <p>Your passcode is hashed client-side using SHA-256 before being sent to Firebase. 
              The actual passcode is never stored or transmitted in plain text.</p>
            </div>
          </div>

          {/* LiveSync Button */}
          <div className="flex justify-center">
            {!unsub ? (
              <button 
                className={`btn ${!isFirebaseConfigured || !code.trim() || isConnecting ? 'btn-secondary' : 'btn-primary'} h-16 px-12`}
                onClick={startLiveSync}
                disabled={!isFirebaseConfigured || !code.trim() || isConnecting}
                title={!isFirebaseConfigured || !code.trim() ? 'Configure Firebase and enter passcode first' : 'Start real-time synchronization'}
              >
                <div className="flex flex-col items-center space-y-1">
                  {isConnecting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Connecting...</span>
                      <span className="text-xs opacity-80">Setting up LiveSync</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-medium">Start LiveSync</span>
                      <span className="text-xs opacity-80">Real-time sync across devices</span>
                    </>
                  )}
                </div>
              </button>
            ) : (
              <button 
                className="btn btn-danger h-16 px-12"
                onClick={stopLiveSync}
                title="Stop LiveSync"
              >
                <div className="flex flex-col items-center space-y-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-medium">Stop LiveSync</span>
                  <span className="text-xs opacity-80">Disconnect real-time sync</span>
                </div>
              </button>
            )}
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
              <div>• <strong>Firestore ID:</strong> SHA-256(passcode) - 64-character hex string</div>
              <div>• <strong>Security:</strong> Firebase rules lock access to valid 64-hex IDs only</div>
              <div>• <strong>Encryption:</strong> All data is encrypted in transit using HTTPS</div>
              <div>• <strong>Real-time:</strong> LiveSync uses Firestore real-time listeners</div>
              <div>• <strong>Cross-device:</strong> Changes sync instantly across all connected devices</div>
            </div>
          </div>

          {/* Connection Info */}
          {unsub && (
            <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <div className="flex items-center justify-center space-x-2 text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">LiveSync Active</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">
                Your data will automatically sync in real-time across all devices using this passcode
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
