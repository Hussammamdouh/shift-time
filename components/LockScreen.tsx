'use client';
import { useEffect, useState } from 'react';
import { disableLock, isLockEnabled, setPasscode, verifyPasscode } from '@/lib/passcode';

export default function LockScreen({ onUnlock }:{ onUnlock: ()=>void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg]   = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(()=>{ setEnabled(isLockEnabled()); }, []);

  async function handleEnter() {
    if (!/^\d{4,8}$/.test(code)) { setMsg('Enter 4–8 digits'); return; }
    const ok = await verifyPasscode(code);
    if (ok) { setMsg(''); onUnlock(); }
    else { setMsg('Incorrect code'); }
  }

  async function handleSet() {
    try {
      await setPasscode(code);
      setEnabled(true);
      setMsg('Passcode set ✓');
      setCode('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set passcode';
      setMsg(errorMessage);
    }
  }

  function append(d: string) {
    if (code.length >= 8) return;
    setCode(prev => prev + d);
  }
  function backspace() {
    setCode(prev => prev.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100]">
      <div className="card w-full max-w-md space-y-8 p-8" onClick={e=>e.stopPropagation()}>
        {/* Enhanced Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-200">
              {enabled ? 'Enter Passcode' : 'Set a Passcode'}
            </h2>
            <p className="text-slate-400 mt-2">
              {enabled
                ? 'This locks the app on this device for security.'
                : 'Create a 4–8 digit passcode. You can change or disable it later in Settings.'}
            </p>
          </div>
        </div>

        {/* Enhanced Dots Display */}
        <div className="flex justify-center gap-3">
          {Array.from({length: Math.max(4, code.length || 4)}).map((_,i)=>(
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < code.length 
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-500 shadow-glow scale-110' 
                  : 'bg-slate-600/50 border border-slate-500/30'
              }`} 
            />
          ))}
        </div>

        {/* Enhanced Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[...'123456789'].map(n=>(
            <button 
              key={n} 
              className="btn btn-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-2xl font-bold transition-all duration-300 hover:scale-105" 
              onClick={()=>append(n)}
            >
              {n}
            </button>
          ))}
          <button 
            className="btn btn-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-105" 
            onClick={()=>setCode('')}
          >
            Clear
          </button>
          <button 
            className="btn btn-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 text-2xl font-bold transition-all duration-300 hover:scale-105" 
            onClick={()=>append('0')}
          >
            0
          </button>
          <button 
            className="btn btn-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:scale-105" 
            onClick={backspace}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l9-9 4.16 4.16M3 12l9 9 4.16-4.16" />
            </svg>
          </button>
        </div>

        {/* Enhanced Message Display */}
        {msg && (
          <div className={`text-center p-4 rounded-xl border ${
            msg.includes('✓') 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {msg.includes('✓') ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{msg}</span>
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="space-y-4">
          {!enabled ? (
            <button 
              className="btn btn-primary w-full h-12 text-lg font-semibold" 
              onClick={handleSet}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Set Passcode
            </button>
          ) : (
            <div className="space-y-3">
              <button 
                className="btn btn-secondary w-full h-12" 
                onClick={()=>setCode('')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Input
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className={`btn ${code.trim() ? 'btn-danger' : 'btn-secondary'} h-12`}
                  onClick={async ()=>{
                    const ok = await verifyPasscode(code);
                    if (ok){ disableLock(); setEnabled(false); setMsg('Lock disabled'); setCode(''); }
                    else setMsg('Enter current passcode, then Disable.'); 
                  }}
                  disabled={!code.trim()}
                  title={!code.trim() ? 'Enter passcode first' : 'Disable app lock'}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Disable
                </button>
                
                <button 
                  className={`btn ${code.trim() ? 'btn-success' : 'btn-secondary'} h-12`}
                  onClick={handleEnter}
                  disabled={!code.trim()}
                  title={!code.trim() ? 'Enter passcode first' : 'Unlock the app'}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Unlock
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Help Text */}
        {!enabled && (
          <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-center space-x-2 text-slate-400 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Security Tip</span>
            </div>
            <p className="text-xs text-slate-500">
              If you skip setting a passcode, the app remains unlocked on this device. 
              You can always set one later in the Settings panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
