'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/types';
import SectionHeader from './SectionHeader';
import { setPasscode, disableLock, isLockEnabled } from '@/lib/passcode';

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export default function SettingsPanel({ snap, setSnap }: { snap: Snapshot; setSnap: (s: Snapshot) => void }) {
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [lockStatus, setLockStatus] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLockStatus(isLockEnabled());
  }, []);

  // Auto-trigger sync when sync settings change
  useEffect(() => {
    const code = snap.prefs.syncCode?.trim();
    if (snap.prefs.autoSync && code) {
      // Trigger sync after a short delay to avoid too frequent calls
      const timer = setTimeout(async () => {
        try {
          setMessage('LiveSync starting...');
          // LiveSync is now handled automatically in AppGate component
          setMessage('LiveSync enabled ✓');
          // Clear success message after 3 seconds
          setTimeout(() => setMessage(''), 3000);
        } catch (error) {
          setMessage(`LiveSync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setTimeout(() => setMessage(''), 5000);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [snap.prefs.autoSync, snap.prefs.syncCode, snap]);

  async function handleSetPasscode() {
    if (newPasscode !== confirmPasscode) {
      setMessage('Passcodes do not match');
      return;
    }
    if (!/^\d{4,8}$/.test(newPasscode)) {
      setMessage('Passcode must be 4-8 digits');
      return;
    }
    
    try {
      await setPasscode(newPasscode);
      setLockStatus(true);
      setMessage('Passcode set successfully ✓');
      setNewPasscode('');
      setConfirmPasscode('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set passcode';
      setMessage(errorMessage);
    }
  }

  async function handleDisableLock() {
    try {
      disableLock();
      setLockStatus(false);
      setMessage('Lock disabled ✓');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable lock';
      setMessage(errorMessage);
    }
  }

  function updatePrefs(updates: Partial<Snapshot['prefs']>) {
    setSnap({
      ...snap,
      prefs: { ...snap.prefs, ...updates },
      updatedAt: Date.now()
    });
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="card space-y-6 tilt">
        <SectionHeader
          title="Settings"
          subtitle="Configure app preferences and security"
          size="lg"
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        />
      </div>

      {/* Enhanced Display Settings */}
      <div className="card space-y-6 tilt">
        <SectionHeader
          title="Display Preferences"
          subtitle="Customize how time and information is displayed"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Time Format</span>
            </label>
            <select
              className="input w-full"
              value={snap.prefs.hourFormat}
              onChange={(e) => updatePrefs({ hourFormat: Number(e.target.value) as 12 | 24 })}
            >
              <option value={24}>24-hour format</option>
              <option value={12}>12-hour format</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Target Hours (per shift)</span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="0.1"
              max="24"
              step="0.1"
              value={(snap.prefs.targetMinutes || 420) / 60}
              onChange={(e) => updatePrefs({ targetMinutes: Math.round(Number(e.target.value) * 60) })}
            />
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Compact Mode</span>
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-sm text-slate-300">Mobile-friendly spacing and controls</span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!snap.prefs.compactMode}
                  onChange={(e) => updatePrefs({ compactMode: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-violet-600 transition-colors relative">
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Billing Settings */}
      <div className="card space-y-6 tilt">
        <SectionHeader
          title="Billing & Rates"
          subtitle="Configure your salary and hourly rates"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          )}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>Monthly Salary ({snap.prefs.currency || 'EGP'})</span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="0"
              step="0.01"
              placeholder="5000.00"
              value={snap.prefs.monthlySalary || ''}
              onChange={(e) => {
                const salary = Number(e.target.value) || 0;
                // Calculate hourly rate: 7 hours/day * 6 days/week * 4 weeks = 168 hours/month
                const hourlyRate = salary > 0 ? salary / 168 : 0;
                updatePrefs({ 
                  monthlySalary: salary,
                  hourlyRate: hourlyRate
                });
              }}
            />
            <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              Based on 7h/day, 6 days/week, monthly calculation
            </div>
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Hourly Rate ({snap.prefs.currency || 'EGP'})</span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="0"
              step="0.01"
              placeholder="29.76"
              value={snap.prefs.hourlyRate || ''}
              onChange={(e) => updatePrefs({ hourlyRate: Number(e.target.value) || undefined })}
            />
            <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              Auto-calculated from salary or set manually
            </div>
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Currency</span>
            </label>
            <select
              className="input w-full"
              value={snap.prefs.currency || 'EGP'}
              onChange={(e) => updatePrefs({ currency: e.target.value })}
            >
              <option value="EGP">EGP (ج.م)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Work Schedule</span>
            </label>
            <div className="text-sm text-slate-400 space-y-2 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span>7 hours net work per day</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>6 working days per week</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
                <span>Monthly calculation period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Vacation & Attendance Settings */}
      <div className="card space-y-6 tilt">
        <SectionHeader
          title="Vacation & Attendance"
          subtitle="Manage your time off and track attendance"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add Vacation Day</span>
              </label>
              <input
                className="input w-full"
                type="date"
                value={snap.prefs.vacationDate || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const vacationDate = new Date(e.target.value);
                    const vacationMs = vacationDate.getTime();
                    
                    // Check if vacation day already exists
                    const existingVacation = snap.history.find(h => 
                      h.tags.includes('vacation') && 
                      new Date(h.startMs).toDateString() === vacationDate.toDateString()
                    );
                    
                    if (!existingVacation) {
                      // Add vacation day to history
                      const newVacation: typeof snap.history[0] = {
                        id: String(Date.now()),
                        startMs: vacationMs,
                        endMs: vacationMs + (7 * 60 * 60 * 1000), // 7 hours
                        netMs: 0, // No work time
                        breakMs: 0,
                        breaks: [],
                        note: 'Vacation Day',
                        tags: ['vacation', 'paid-leave'],
                      };
                      
                      setSnap({
                        ...snap,
                        history: [newVacation, ...snap.history],
                        updatedAt: Date.now()
                      });
                      
                      // Clear the date input
                      updatePrefs({ vacationDate: '' });
                    } else {
                      alert('Vacation day already exists for this date');
                    }
                  }
                }}
              />
              <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                Add paid vacation days to track attendance
              </div>
            </div>
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Vacation Days This Month</span>
              </label>
              <div className="text-3xl font-bold text-blue-400 bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
                {snap.history.filter(h => 
                  h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="text-xs text-slate-500">Current month vacation count</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-6 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors duration-300">
              <div className="text-3xl font-bold text-emerald-400">
                {snap.history.filter(h => 
                  !h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="text-sm text-emerald-300">Working Days</div>
            </div>
            <div className="text-center p-6 bg-blue-500/20 rounded-2xl border border-blue-500/30 hover:bg-blue-500/30 transition-colors duration-300">
              <div className="text-3xl font-bold text-blue-400">
                {snap.history.filter(h => 
                  h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="text-sm text-blue-300">Vacation Days</div>
            </div>
            <div className="text-center p-6 bg-yellow-500/20 rounded-2xl border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors duration-300">
              <div className="text-3xl font-bold text-yellow-400">
                {Math.max(0, 26 - snap.history.filter(h => 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length)}
              </div>
              <div className="text-sm text-yellow-300">Remaining Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Sync Settings */}
      <div className="card space-y-6 tilt">
        <SectionHeader
          title="Data Synchronization"
          subtitle="Sync your data across devices"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>LiveSync Passcode</span>
            </label>
            <input 
              className="input w-full" 
              placeholder="e.g. 4937 (4-8 digits)" 
              value={snap.prefs.syncCode || ''} 
              onChange={(e) => updatePrefs({ syncCode: e.target.value })}
            />
            <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="font-medium mb-1">🔐 Security Note:</div>
              <p>Your passcode is hashed client-side using SHA-256 before being sent to Firebase. 
              The actual passcode is never stored or transmitted in plain text.</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>LiveSync</span>
            </label>
            <div className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                id="autoSync"
                checked={snap.prefs.autoSync !== false} 
                onChange={(e) => updatePrefs({ autoSync: e.target.checked })}
                className="w-5 h-5 text-violet-600 bg-slate-800 border-slate-600 rounded focus:ring-violet-500 focus:ring-2"
              />
              <label htmlFor="autoSync" className="text-slate-300">Enable real-time sync across devices</label>
            </div>
            <div className="text-xs text-slate-500 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <div className="font-medium mb-1 text-blue-400">💡 LiveSync Info:</div>
              <p>When enabled, all your changes (shifts, breaks, settings) will automatically sync in real-time across all devices using the same passcode.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Security Settings */}
      <div className="card space-y-6">
        <SectionHeader
          title="Security & Privacy"
          subtitle="Protect your app with a passcode"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        />
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-slate-300">App Lock Status</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              lockStatus 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {lockStatus ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          {!lockStatus ? (
            <div className="space-y-4 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">New Passcode</label>
                  <input 
                    className="input w-full" 
                    type="password" 
                    placeholder="4-8 digits" 
                    value={newPasscode} 
                    onChange={(e) => setNewPasscode(e.target.value)}
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Confirm Passcode</label>
                  <input 
                    className="input w-full" 
                    type="password" 
                    placeholder="4-8 digits" 
                    value={confirmPasscode} 
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    maxLength={8}
                  />
                </div>
              </div>
              <button 
                className={`btn ${newPasscode.trim() && confirmPasscode.trim() ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleSetPasscode}
                disabled={!newPasscode.trim() || !confirmPasscode.trim()}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Enable Lock
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center space-x-3 text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">App is locked with a passcode</span>
              </div>
              <button 
                className="btn btn-danger w-full" 
                onClick={handleDisableLock}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Disable Lock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Data Management */}
      <div className="card space-y-6">
        <SectionHeader
          title="Data Management"
          subtitle="View statistics and manage your data"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          )}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Total Shifts</label>
            <div className="text-3xl font-bold text-slate-200 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              {snap.history.length}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400">Total Working Hours</label>
            <div className="text-3xl font-bold text-slate-200 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              {(() => { const hrs = (snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000); const h = Math.floor(hrs); const m = Math.round((hrs % 1) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; })()}
            </div>
          </div>
          {snap.prefs.hourlyRate && snap.prefs.hourlyRate > 0 && (
            <div className="lg:col-span-2 space-y-3">
              <label className="text-sm font-medium text-slate-400">Total Earnings</label>
              <div className="text-3xl font-bold text-emerald-400 bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/30">
                {formatCurrency((snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000) * snap.prefs.hourlyRate, snap.prefs.currency)}
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t border-slate-700/50">
          <button 
            className="btn btn-danger w-full" 
            onClick={() => {
              if (confirm('Are you sure? This will clear all data and cannot be undone.')) {
                setSnap({
                  ...snap,
                  history: [],
                  watch: { status: 'IDLE', startTimeMs: null, endTimeMs: null, breaks: [], targetMinutes: 420 },
                  manual: { breaks: [] },
                  updatedAt: Date.now()
                });
              }
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All Data
          </button>
        </div>
      </div>

      {/* Enhanced Message Display */}
      {message && (
        <div className={`card text-center space-y-3 ${
          message.includes('✓') 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {message.includes('✓') ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
