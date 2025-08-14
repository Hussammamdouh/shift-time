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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="card w-full max-w-sm space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="text-center space-y-1">
          <h2>{enabled ? 'Enter Passcode' : 'Set a Passcode'}</h2>
          <small className="opacity-70">
            {enabled
              ? 'This locks the app on this device.'
              : '4–8 digits. You can change/disable it later in Settings.'}
          </small>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({length: Math.max(4, code.length || 4)}).map((_,i)=>(
            <div key={i} className={`w-3 h-3 rounded-full ${i < code.length ? 'bg-white' : 'bg-white/20'}`} />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {[...'123456789'].map(n=>(
            <button key={n} className="btn py-4 text-xl" onClick={()=>append(n)}>{n}</button>
          ))}
          <button className="btn py-4" onClick={()=>setCode('')}>Clear</button>
          <button className="btn py-4 text-xl" onClick={()=>append('0')}>0</button>
          <button className="btn py-4" onClick={backspace}>⌫</button>
        </div>

        {msg && <div className="text-center text-sm text-red-400">{msg}</div>}

        <div className="flex gap-2 justify-between">
          {!enabled ? (
            <button className="btn bg-blue-600 hover:bg-blue-500" onClick={handleSet}>Save</button>
          ) : (
            <>
              <button className="btn" onClick={()=>setCode('')}>Reset input</button>
              <div className="flex gap-2">
                <button className="btn" onClick={async ()=>{
                  const ok = await verifyPasscode(code);
                  if (ok){ disableLock(); setEnabled(false); setMsg('Lock disabled'); setCode(''); }
                  else setMsg('Enter current passcode, then Disable.'); 
                }}>Disable</button>
                <button className="btn bg-blue-600 hover:bg-blue-500" onClick={handleEnter}>Unlock</button>
              </div>
            </>
          )}
        </div>

        {!enabled && (
          <div className="text-xs opacity-60 text-center">
            Tip: If you skip setting a passcode, the app remains unlocked on this device.
          </div>
        )}
      </div>
    </div>
  );
}
