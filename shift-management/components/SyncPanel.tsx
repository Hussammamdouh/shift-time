'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { pullSnapshot, pushSnapshot, subscribeRoom } from '@/lib/sync';
import { db } from '@/lib/firebase';

export default function SyncPanel({ snap, setSnap }: { snap: Snapshot; setSnap: (s: Snapshot) => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('—');
  const [unsub, setUnsub] = useState<null | (() => void)>(null);

  // Check if Firebase is configured
  const isFirebaseConfigured = db !== null;

  useEffect(() => () => { unsub?.(); }, [unsub]);

  async function doPull() {
    if (!isFirebaseConfigured) {
      setStatus('Firebase not configured');
      return;
    }
    
    setStatus('Pulling…');
    try {
      const got = await pullSnapshot(code);
      if (got) { 
        setSnap(got); 
        setStatus('Pulled ✓'); 
      } else { 
        setStatus('No data for this code'); 
      }
    } catch (error) {
      setStatus('Pull failed');
      console.error('Pull error:', error);
    }
  }
  
  async function doPush() {
    if (!isFirebaseConfigured) {
      setStatus('Firebase not configured');
      return;
    }
    
    setStatus('Pushing…');
    try {
      await pushSnapshot(code, snap);
      setStatus('Pushed ✓');
    } catch (error) {
      setStatus('Push failed');
      console.error('Push error:', error);
    }
  }
  
  async function doLive() {
    if (!isFirebaseConfigured) {
      setStatus('Firebase not configured');
      return;
    }
    
    if (unsub) {
      unsub(); 
      setUnsub(null); 
      setStatus('Live unsubscribed');
      return;
    }
    setStatus('Subscribing…');
    try {
      const u = await subscribeRoom(code, (remote) => {
        if (remote) { 
          setSnap(remote); 
          setStatus('Live update ✓'); 
        }
      });
      setUnsub(() => u);
    } catch (error) {
      setStatus('Live failed');
      console.error('Live error:', error);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2>Sync</h2>
        <small>Share across devices with a passcode (hashed client-side)</small>
      </div>

      {!isFirebaseConfigured && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-yellow-400 font-semibold mb-2">⚠️ Firebase Not Configured</div>
          <div className="text-sm text-yellow-300 mb-3">
            Sync features are disabled. Create a .env.local file with your Firebase configuration to enable sync.
          </div>
          <div className="text-xs text-yellow-400">
            See env.template for required variables
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label>Passcode</label>
          <input 
            className="input w-full" 
            placeholder="e.g. 4937" 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            disabled={!isFirebaseConfigured}
          />
        </div>
        <div className="flex gap-2">
          <button 
            className="btn" 
            onClick={doPull}
            disabled={!isFirebaseConfigured || !code.trim()}
          >
            Pull
          </button>
          <button 
            className="btn" 
            onClick={doPush}
            disabled={!isFirebaseConfigured || !code.trim()}
          >
            Push
          </button>
          <button 
            className="btn" 
            onClick={doLive}
            disabled={!isFirebaseConfigured || !code.trim()}
          >
            {unsub ? 'Stop Live' : 'Live'}
          </button>
        </div>
      </div>

      <div><span className="pill">{status}</span></div>
      <p className="text-xs opacity-70">Firestore doc id = SHA-256(passcode). Rules lock to 64-hex ids.</p>
    </div>
  );
}
