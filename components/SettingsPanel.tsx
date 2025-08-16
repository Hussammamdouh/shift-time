'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/types';
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
    <div className="card space-y-6">
      <div>
        <h2>Settings</h2>
        <small>Configure app preferences and security</small>
      </div>

      {/* Display Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Display</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Time Format</label>
            <select
              className="input w-full"
              value={snap.prefs.hourFormat}
              onChange={(e) => updatePrefs({ hourFormat: Number(e.target.value) as 12 | 24 })}
            >
              <option value={24}>24-hour</option>
              <option value={12}>12-hour</option>
            </select>
          </div>
          <div>
            <label>Target Hours (per shift)</label>
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
        </div>
      </div>

      {/* Billing Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Billing & Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Monthly Salary (EGP)</label>
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
            <div className="form-help">Based on 7h/day, 6 days/week, monthly calculation</div>
          </div>
          <div>
            <label>Hourly Rate (EGP)</label>
            <input
              className="input w-full"
              type="number"
              min="0"
              step="0.01"
              placeholder="29.76"
              value={snap.prefs.hourlyRate || ''}
              onChange={(e) => updatePrefs({ hourlyRate: Number(e.target.value) || undefined })}
            />
            <div className="form-help">Auto-calculated from salary or set manually</div>
          </div>
          <div>
            <label>Currency</label>
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
          <div>
            <label>Work Schedule</label>
            <div className="text-sm text-gray-400 space-y-1">
              <div>• 7 hours net work per day</div>
              <div>• 6 working days per week</div>
              <div>• Monthly calculation period</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vacation & Attendance Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Vacation & Attendance</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Add Vacation Day</label>
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
              <div className="form-help">Add paid vacation days to track attendance</div>
            </div>
            <div>
              <label>Vacation Days This Month</label>
              <div className="text-2xl font-mono text-blue-400">
                {snap.history.filter(h => 
                  h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="form-help">Current month vacation count</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-2xl font-bold text-green-400">
                {snap.history.filter(h => 
                  !h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="text-sm text-gray-400">Working Days</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-2xl font-bold text-blue-400">
                {snap.history.filter(h => 
                  h.tags.includes('vacation') && 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <div className="text-sm text-gray-400">Vacation Days</div>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-2xl font-bold text-yellow-400">
                {Math.max(0, 26 - snap.history.filter(h => 
                  new Date(h.startMs).getMonth() === new Date().getMonth()
                ).length)}
              </div>
              <div className="text-sm text-gray-400">Remaining Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sync</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Sync Passcode</label>
            <input 
              className="input w-full" 
              placeholder="e.g. 4937" 
              value={snap.prefs.syncCode || ''} 
              onChange={(e) => updatePrefs({ syncCode: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="autoSync"
              checked={snap.prefs.autoSync || false} 
              onChange={(e) => updatePrefs({ autoSync: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="autoSync">Auto-sync on changes</label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>App Lock</span>
            <span className="pill">{lockStatus ? 'Enabled' : 'Disabled'}</span>
          </div>
          
          {!lockStatus ? (
            <div className="space-y-3 p-4 border border-white/10 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label>New Passcode</label>
                  <input 
                    className="input w-full" 
                    type="password" 
                    placeholder="4-8 digits" 
                    value={newPasscode} 
                    onChange={(e) => setNewPasscode(e.target.value)}
                    maxLength={8}
                  />
                </div>
                <div>
                  <label>Confirm Passcode</label>
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
                className="btn bg-blue-600 hover:bg-blue-500 w-full" 
                onClick={handleSetPasscode}
                disabled={!newPasscode || !confirmPasscode}
              >
                Enable Lock
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-4 border border-white/10 rounded-xl">
              <p className="text-sm opacity-70">App is locked with a passcode</p>
              <button 
                className="btn bg-red-600 hover:bg-red-500 w-full" 
                onClick={handleDisableLock}
              >
                Disable Lock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>Total Shifts</label>
            <div className="text-2xl font-mono">{snap.history.length}</div>
          </div>
          <div>
            <label>Total Working Hours</label>
            <div className="text-2xl font-mono">
              {(snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000).toFixed(1)}h
            </div>
          </div>
          {snap.prefs.hourlyRate && snap.prefs.hourlyRate > 0 && (
            <div className="md:col-span-2">
              <label>Total Earnings</label>
              <div className="text-2xl font-mono text-green-400">
                {formatCurrency((snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000) * snap.prefs.hourlyRate, snap.prefs.currency)}
              </div>
            </div>
          )}
        </div>
        <button 
          className="btn bg-red-600 hover:bg-red-500 w-full" 
          onClick={() => {
            if (confirm('Are you sure? This will clear all data.')) {
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
          Clear All Data
        </button>
      </div>

      {message && (
        <div className={`text-center text-sm ${message.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
