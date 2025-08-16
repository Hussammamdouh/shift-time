'use client';
import { useState } from 'react';
import { downloadSummaryCSV } from '../lib/csv';
import { shiftSummary } from '../lib/timeUtils';
import EditShiftModal from './EditShiftModal';
import type { HistoryRec, Snapshot } from '../lib/types';

type Props = { 
  snap: Snapshot; 
  setSnap: (s: Snapshot) => void; 
  onDelete: (id: string) => void;
};

export default function ReportTable({ snap, setSnap, onDelete }: Props) {
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'breaks' | 'overtime'>('date');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ kind: 'history', id: string, record: HistoryRec } | null>(null);

  // Calculate statistics
  const totalShifts = snap.history.length;
  const totalNetHours = snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000;
  const averageShiftLength = totalShifts > 0 ? totalNetHours / totalShifts : 0;
  
  // Calculate overtime (hours beyond 7 hours per session, based on net working hours)
  const targetDailyHours = 7; // 7 hours net work daily
  const totalOvertimeHours = snap.history.reduce((a, r) => {
    const shiftNetHours = r.netMs / 3600000;
    const overtime = Math.max(0, shiftNetHours - targetDailyHours);
    return a + overtime;
  }, 0);
  
  // Calculate earnings (only on net working hours + overtime)
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const totalEarnings = hourlyRate > 0 ? totalNetHours * hourlyRate : 0;
  const averageEarningsPerShift = totalShifts > 0 ? totalEarnings / totalShifts : 0;
  
  // Calculate overtime earnings (same rate as normal hours)
  const totalOvertimeEarnings = hourlyRate > 0 ? totalOvertimeHours * hourlyRate : 0;
  
  // Helper function to round to 2 decimal places
  const roundToTwo = (num: number) => Math.round(num * 100) / 100;

  // Filter and sort shifts
  const filteredShifts = snap.history
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.startMs - a.startMs;
        case 'duration':
          return b.netMs - a.netMs;
        case 'breaks':
          return b.breakMs - a.breakMs;
        case 'overtime':
          const aOvertime = Math.max(0, (a.netMs / 3600000) - 7);
          const bOvertime = Math.max(0, (b.netMs / 3600000) - 7);
          return bOvertime - aOvertime;
        default:
          return 0;
      }
    });

  function openEditModal(shift: HistoryRec) {
    setEditTarget({ kind: 'history', id: shift.id, record: shift });
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditTarget(null);
  }

  function parseCSV(csv: string): HistoryRec[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const shifts: HistoryRec[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const shift: Partial<HistoryRec> = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header.toLowerCase()) {
          case 'startms':
          case 'start_ms':
            shift.startMs = parseInt(value);
            break;
          case 'endms':
          case 'end_ms':
            shift.endMs = parseInt(value);
            break;
          case 'netms':
          case 'net_ms':
            shift.netMs = parseInt(value);
            break;
          case 'breakms':
          case 'break_ms':
            shift.breakMs = parseInt(value);
            break;
          case 'note':
            shift.note = value;
            break;
          case 'tags':
            shift.tags = value ? value.split(';').map(t => t.trim()) : [];
            break;
        }
      });
      
      if (shift.startMs && shift.endMs) {
        shifts.push({
          id: String(Date.now() + Math.random()),
          startMs: shift.startMs,
          endMs: shift.endMs,
          netMs: shift.netMs || (shift.endMs - shift.startMs),
          breakMs: shift.breakMs || 0,
          breaks: [],
          note: shift.note || '',
          tags: shift.tags || [],
        });
      }
    }
    
    return shifts;
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: snap.prefs.hourFormat === 12
    });
  }

  return (
    <div className="space-y-12">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div className="card text-center space-y-3 card-hover">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-slate-200">{totalShifts}</div>
          <div className="text-sm text-slate-400">Total Shifts</div>
        </div>

        <div className="card text-center space-y-3 card-hover">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-green">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-slate-200">{roundToTwo(totalNetHours).toFixed(2)}h</div>
          <div className="text-sm text-slate-400">Total Hours</div>
        </div>

        <div className="card text-center space-y-3 card-hover">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-blue">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-slate-200">{roundToTwo(averageShiftLength).toFixed(2)}h</div>
          <div className="text-sm text-slate-400">Avg. Shift</div>
        </div>

        <div className="card text-center space-y-3 card-hover">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-slate-200">
            {roundToTwo(snap.history.reduce((a, r) => a + r.breakMs, 0) / 3600000).toFixed(2)}h
          </div>
          <div className="text-sm text-slate-400">Break Time</div>
        </div>

        {/* Overtime Card */}
        <div className="card text-center space-y-3 card-hover">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-pink-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-slate-200">{roundToTwo(totalOvertimeHours).toFixed(2)}h</div>
          <div className="text-sm text-slate-400">Overtime Hours</div>
          {hourlyRate > 0 && (
            <div className="text-xs text-slate-500">
              {roundToTwo(totalOvertimeEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
            </div>
          )}
        </div>

        {/* Earnings Card - Only show if hourly rate is set */}
        {hourlyRate > 0 && (
          <div className="card text-center space-y-3 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-green">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {roundToTwo(totalEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
            </div>
            <div className="text-sm text-slate-400">Total Earnings</div>
            <div className="text-xs text-slate-500">
              Avg: {roundToTwo(averageEarningsPerShift).toFixed(2)} {snap.prefs.currency || 'EGP'}/shift
            </div>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="card space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Sort By */}
            <div className="flex-1 min-w-0">
              <label className="form-label">Sort By</label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'breaks' | 'overtime')}
              >
                <option value="date">Date (Newest)</option>
                <option value="duration">Duration (Longest)</option>
                <option value="breaks">Break Time</option>
                <option value="overtime">Overtime Hours</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="btn btn-success"
              onClick={() => downloadSummaryCSV(filteredShifts, snap.prefs)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export All
            </button>
            <button
              className="btn btn-info"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const csv = e.target?.result as string;
                      const importedShifts = parseCSV(csv);
                      
                      if (importedShifts.length > 0) {
                        // Merge imported data with existing history
                        const newHistory = [...snap.history];
                        importedShifts.forEach(shift => {
                          // Check if shift already exists (by start time and duration)
                          const exists = newHistory.some(existing => 
                            existing.startMs === shift.startMs && 
                            existing.netMs === shift.netMs
                          );
                          if (!exists) {
                            newHistory.push({
                              ...shift,
                              id: String(Date.now() + Math.random()), // Generate unique ID
                            });
                          }
                        });
                        
                        setSnap({
                          ...snap,
                          history: newHistory,
                          updatedAt: Date.now(),
                        });
                        
                        alert(`Successfully imported ${importedShifts.length} shifts!`);
                      }
                    } catch (error) {
                      console.error('Import error:', error);
                      alert('Failed to import data. Please check the CSV format.');
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Import CSV
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Showing {filteredShifts.length} of {totalShifts} shifts</span>
        </div>
        
        {/* Overtime Info */}
        <div className="text-xs text-slate-500 bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium text-slate-300">Overtime Calculation</span>
          </div>
          <p>Overtime is calculated as net working hours (excluding breaks) beyond the 7-hour daily target per session. Overtime hours are paid at the same rate as regular hours.</p>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="card space-y-6">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="table-header px-8 py-6">Date</th>
                <th className="table-header px-8 py-6">Start Time</th>
                <th className="table-header px-8 py-6">End Time</th>
                <th className="table-header px-8 py-6">Duration</th>
                <th className="table-header px-8 py-6">Break Time</th>
                <th className="table-header px-8 py-6">Overtime</th>
                <th className="table-header px-8 py-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => {
                const summary = shiftSummary(shift.startMs, shift.endMs, shift.breaks, snap.prefs.hourFormat);
                return (
                  <tr key={shift.id} className="table-row">
                    <td className="table-cell px-8 py-6">
                      <div className="font-medium text-slate-200">{formatDate(shift.startMs)}</div>
                    </td>
                    <td className="table-cell px-8 py-6 font-mono text-slate-300">
                      {formatTime(shift.startMs)}
                    </td>
                    <td className="table-cell px-8 py-6 font-mono text-slate-300">
                      {formatTime(shift.endMs)}
                    </td>
                    <td className="table-cell px-8 py-6">
                      <div className="font-medium text-slate-200">{summary.net}</div>
                    </td>
                    <td className="table-cell px-8 py-6">
                      <div className="text-slate-300">{summary.breakTotal}</div>
                    </td>
                    <td className="table-cell px-8 py-6">
                      <div className={`font-medium ${summary.overtimeHours > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                        {summary.overtime}
                      </div>
                      {summary.overtimeHours > 0 && (
                        <div className="text-xs text-slate-500 mt-2">
                          +{summary.overtimeHours.toFixed(2)}h beyond 7h target
                        </div>
                      )}
                    </td>
                    <td className="table-cell px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <button
                          className="btn btn-ghost btn-sm p-2"
                          onClick={() => openEditModal(shift)}
                          title="Edit Shift"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger btn-sm p-2"
                          onClick={() => onDelete(shift.id)}
                          title="Delete Shift"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredShifts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-medium text-slate-200 mb-4">No shifts found</h3>
            <p className="text-slate-400 text-lg">
              Start tracking your time to see shifts here
            </p>
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      <EditShiftModal
        open={editModalOpen}
        onClose={closeEditModal}
        target={editTarget}
        snap={snap}
        setSnap={setSnap}
      />
    </div>
  );
}
