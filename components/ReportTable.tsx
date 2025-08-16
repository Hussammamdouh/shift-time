'use client';
import { useState } from 'react';
import { downloadSummaryCSV, downloadCompatibleCSV } from '../lib/csv';
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
    try {
      const lines = csv.split('\n').filter(line => line.trim()); // Remove empty lines
      if (lines.length < 2) {
        console.warn('CSV has insufficient lines:', lines.length);
        return [];
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const shifts: HistoryRec[] = [];
      const existingShifts = snap.history; // Get existing shifts for duplicate detection
      
      console.log('CSV Headers detected:', headers);
      console.log(`Checking for duplicates against ${existingShifts.length} existing shifts`);
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const values = parseCSVLine(line);
          if (values.length === 0) continue;
          
          const shift: Partial<HistoryRec> = {};
          
          headers.forEach((header, index) => {
            const value = values[index];
            if (value === undefined || value === '') return;
            
            switch (header) {
              // Primary import fields (millisecond timestamps)
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
              case 'notes':
                shift.note = value;
                break;
              case 'tags':
                shift.tags = value ? value.split(';').map(t => t.trim()).filter(t => t) : [];
                break;
              
              // Legacy format support
              case 'start time':
              case 'start':
                if (!shift.startMs) {
                  // Try to parse time format
                  const parsed = parseTimeValue(value);
                  if (parsed) shift.startMs = parsed;
                }
                break;
              case 'end time':
              case 'end':
                if (!shift.endMs) {
                  const parsed = parseTimeValue(value);
                  if (parsed) shift.endMs = parsed;
                }
                break;
              case 'net working time (hh:mm)':
              case 'duration (hh:mm)':
                if (!shift.netMs && value.includes(':')) {
                  const [hours, minutes] = value.split(':').map(Number);
                  shift.netMs = (hours * 60 + minutes) * 60000;
                }
                break;
              case 'break time (hh:mm)':
                if (!shift.breakMs && value.includes(':')) {
                  const [hours, minutes] = value.split(':').map(Number);
                  shift.breakMs = (hours * 60 + minutes) * 60000;
                }
                break;
              case 'date':
                // If we have a date but no start time, try to parse it
                if (!shift.startMs) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    shift.startMs = date.getTime();
                  }
                }
                break;
              case 'overtime (hh:mm)':
                // Skip overtime column - it's calculated
                break;
            }
          });
          
          // Validate and create the shift
          if (shift.startMs && shift.endMs) {
            // Ensure end time is after start time
            if (shift.endMs <= shift.startMs) {
              console.warn(`Skipping shift with invalid time range: start=${shift.startMs}, end=${shift.endMs}`);
              continue;
            }
            
            // Check for duplicates with existing shifts
            const isDuplicate = existingShifts.some(existingShift => {
              // Check for exact time match (within 1 minute tolerance)
              const startDiff = Math.abs(existingShift.startMs - shift.startMs!);
              const endDiff = Math.abs(existingShift.endMs - shift.endMs!);
              const timeTolerance = 60000; // 1 minute in milliseconds
              
              if (startDiff <= timeTolerance && endDiff <= timeTolerance) {
                console.log(`Skipping duplicate shift: ${new Date(shift.startMs!).toLocaleString()} - ${new Date(shift.endMs!).toLocaleString()}`);
                return true;
              }
              
              // Check for overlapping time ranges (handles overnight shifts)
              const hasOverlap = (
                (shift.startMs! < existingShift.endMs && shift.endMs! > existingShift.startMs) ||
                (existingShift.startMs < shift.endMs! && existingShift.endMs > shift.startMs!)
              );
              
              if (hasOverlap) {
                console.log(`Skipping overlapping shift: ${new Date(shift.startMs!).toLocaleString()} - ${new Date(shift.endMs!).toLocaleString()} overlaps with existing shift`);
                return true;
              }
              
              return false;
            });
            
            if (isDuplicate) {
              continue; // Skip this duplicate shift
            }
            
            const finalShift: HistoryRec = {
              id: String(Date.now() + Math.random()),
              startMs: shift.startMs,
              endMs: shift.endMs,
              netMs: shift.netMs || (shift.endMs - shift.startMs),
              breakMs: shift.breakMs || 0,
              breaks: [], // Breaks array is not exported, so we'll reconstruct
              note: shift.note || '',
              tags: shift.tags || [],
            };
            
            shifts.push(finalShift);
            console.log('Successfully parsed shift:', finalShift);
          } else {
            console.warn(`Skipping incomplete shift at line ${i + 1}:`, shift);
          }
        } catch (lineError) {
          console.error(`Error parsing line ${i + 1}:`, lineError, 'Line:', line);
          continue;
        }
      }
      
      console.log(`Successfully parsed ${shifts.length} shifts from CSV (duplicates skipped)`);
      return shifts;
    } catch (error) {
      console.error('CSV parsing error:', error);
      return [];
    }
  }

  // Helper function to parse CSV line with proper comma handling
  function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    values.push(current.trim());
    return values;
  }

  // Helper function to parse time values
  function parseTimeValue(value: string): number | null {
    // Try to parse as timestamp first
    const timestamp = parseInt(value);
    if (!isNaN(timestamp) && timestamp > 0) {
      return timestamp;
    }
    
    // Try to parse as date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    return null;
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
      {/* Enhanced Statistics Dashboard */}
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-glow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-200">Performance Overview</h2>
            <p className="text-slate-400">Your shift statistics and insights</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="card text-center space-y-4 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-200">{totalShifts}</div>
              <div className="text-sm text-slate-400">Total Shifts</div>
            </div>
          </div>

          <div className="card text-center space-y-4 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-green">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-200">{roundToTwo(totalNetHours).toFixed(2)}h</div>
              <div className="text-sm text-slate-400">Total Hours</div>
            </div>
          </div>

          <div className="card text-center space-y-4 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-blue">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-200">{roundToTwo(averageShiftLength).toFixed(2)}h</div>
              <div className="text-sm text-slate-400">Avg. Shift</div>
            </div>
          </div>

          <div className="card text-center space-y-4 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-200">
                {roundToTwo(snap.history.reduce((a, r) => a + r.breakMs, 0) / 3600000).toFixed(2)}h
              </div>
              <div className="text-sm text-slate-400">Break Time</div>
            </div>
          </div>

          {/* Enhanced Overtime Card */}
          <div className="card text-center space-y-4 card-hover">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-pink-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-200">{roundToTwo(totalOvertimeHours).toFixed(2)}h</div>
              <div className="text-sm text-slate-400">Overtime Hours</div>
              {hourlyRate > 0 && (
                <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                  +{roundToTwo(totalOvertimeEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Earnings Card - Only show if hourly rate is set */}
          {hourlyRate > 0 && (
            <div className="card text-center space-y-4 card-hover">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow-green">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-emerald-400">
                  {roundToTwo(totalEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
                </div>
                <div className="text-sm text-slate-400">Total Earnings</div>
                <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                  Avg: {roundToTwo(averageEarningsPerShift).toFixed(2)} {snap.prefs.currency || 'EGP'}/shift
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Filters and Actions */}
      <div className="card space-y-8">
        {/* Enhanced Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200">Data Management</h3>
              <p className="text-slate-400">Filter, sort, and manage your shift data</p>
            </div>
          </div>
        </div>

        {/* Reorganized Controls Section */}
        <div className="space-y-6">
          {/* Primary Controls Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sort Controls */}
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Sort & Filter</span>
              </label>
              <select
                className="input w-full"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'breaks' | 'overtime')}
              >
                <option value="date">Date (Newest First)</option>
                <option value="duration">Duration (Longest First)</option>
                <option value="breaks">Break Time (Longest First)</option>
                <option value="overtime">Overtime Hours (Highest First)</option>
              </select>
            </div>

            {/* Data Export */}
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Export Data</span>
              </label>
              <button
                className="btn btn-success w-full"
                onClick={() => downloadSummaryCSV(filteredShifts, snap.prefs)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Export All Shifts
              </button>
              
              <button
                className="btn btn-info w-full mt-3"
                onClick={() => downloadCompatibleCSV(filteredShifts)}
                title="Export data in compatible format for importing on other devices"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 01-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Export Compatible
              </button>
            </div>

            {/* Data Import */}
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Import Data</span>
              </label>
              <button
                className="btn btn-info w-full"
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
                          
                          // Add all imported shifts (duplicates already filtered out by parseCSV)
                          importedShifts.forEach(shift => {
                            newHistory.push({
                              ...shift,
                              id: String(Date.now() + Math.random()), // Generate unique ID
                            });
                          });
                          
                          setSnap({
                            ...snap,
                            history: newHistory,
                            updatedAt: Date.now(),
                          });
                          
                          alert(`Successfully imported ${importedShifts.length} shifts! Duplicates were automatically detected and skipped.`);
                        } else {
                          alert('No valid shifts found in the CSV file. Please check the format.\n\nTip: Use the "Export Compatible" button to create files that can be imported on other devices.');
                        }
                      } catch (error) {
                        console.error('Import error:', error);
                        alert('Failed to import data. Please check the CSV format and try again.\n\nTip: Use the "Export Compatible" button to create files that can be imported on other devices.');
                      }
                    };
                    
                    reader.onerror = () => {
                      alert('Error reading the file. Please try again.');
                    };
                    
                    reader.readAsText(file);
                  };
                  input.click();
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Import CSV File
              </button>
            </div>
          </div>

          {/* Secondary Information Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Results Summary */}
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Data Summary</span>
              </label>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center space-x-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm">Showing <span className="font-semibold text-slate-200">{filteredShifts.length}</span> of <span className="font-semibold text-slate-200">{totalShifts}</span> shifts</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Quick Actions:</span>
              <button
                className={`btn btn-sm ${filteredShifts.length > 0 ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => setSortBy('date')}
                disabled={filteredShifts.length === 0}
                title={filteredShifts.length === 0 ? 'No shifts to sort' : 'Sort by most recent'}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Recent
              </button>
              <button
                className={`btn btn-sm ${filteredShifts.length > 0 ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => setSortBy('duration')}
                disabled={filteredShifts.length === 0}
                title={filteredShifts.length === 0 ? 'No shifts to sort' : 'Sort by longest duration'}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Longest
              </button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Overtime Info */}
        <div className="text-sm text-slate-500 bg-slate-800/30 rounded-xl p-6 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-medium text-slate-300">Overtime Calculation</span>
          </div>
          <p className="leading-relaxed">
            Overtime is calculated as net working hours (excluding breaks) beyond the 7-hour daily target per session. 
            Overtime hours are paid at the same rate as regular hours.
          </p>
        </div>
      </div>

      {/* Enhanced Shifts Table */}
      <div className="card space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Shift History</h3>
              <p className="text-sm text-slate-400">Detailed view of all your recorded shifts</p>
            </div>
          </div>
          
          {/* Enhanced Table Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{filteredShifts.length} shifts</span>
            </div>
            <div className="w-px h-6 bg-slate-600"></div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>Working</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>Overtime</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Date</span>
                  </div>
                </th>
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Time Range</span>
                  </div>
                </th>
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Duration</span>
                  </div>
                </th>
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Break Time</span>
                  </div>
                </th>
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Overtime</span>
                  </div>
                </th>
                <th className="table-header px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => {
                const summary = shiftSummary(shift.startMs, shift.endMs, shift.breaks, snap.prefs.hourFormat);
                const hasOvertime = summary.overtimeHours > 0;
                const isToday = new Date(shift.startMs).toDateString() === new Date().toDateString();
                
                return (
                  <tr key={shift.id} className="table-row group hover:bg-slate-800/30">
                    {/* Enhanced Date Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="space-y-1">
                        <div className={`font-semibold ${isToday ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {formatDate(shift.startMs)}
                        </div>
                        {isToday && (
                          <div className="inline-flex items-center px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse"></div>
                            Today
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Enhanced Time Range Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
                          <span className="font-mono text-slate-300 text-sm">{formatTime(shift.startMs)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span className="font-mono text-slate-300 text-sm">{formatTime(shift.endMs)}</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Enhanced Duration Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-slate-200">{summary.net}</div>
                        <div className="text-xs text-slate-400">
                          {Math.round((shift.netMs / 3600000) * 100) / 100}h net work
                        </div>
                      </div>
                    </td>
                    
                    {/* Enhanced Break Time Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="space-y-2">
                        <div className={`text-lg font-semibold ${shift.breakMs > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                          {summary.breakTotal}
                        </div>
                        {shift.breakMs > 0 && (
                          <div className="text-xs text-slate-500">
                            {shift.breaks.length} break{shift.breaks.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Enhanced Overtime Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="space-y-3">
                        <div className={`text-lg font-bold ${hasOvertime ? 'text-orange-400' : 'text-slate-400'}`}>
                          {summary.overtime}
                        </div>
                        {hasOvertime && (
                          <div className="space-y-2">
                            <div className="inline-flex items-center px-3 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              +{summary.overtimeHours.toFixed(2)}h beyond 7h target
                            </div>
                            {snap.prefs.hourlyRate && snap.prefs.hourlyRate > 0 && (
                              <div className="text-xs text-slate-500">
                                +{((summary.overtimeHours * snap.prefs.hourlyRate)).toFixed(2)} {snap.prefs.currency || 'EGP'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Enhanced Actions Column */}
                    <td className="table-cell px-6 py-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          className="btn btn-ghost btn-sm p-2 hover:bg-slate-700/50 hover:scale-110 transition-all duration-200"
                          onClick={() => openEditModal(shift)}
                          title="Edit Shift"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger btn-sm p-2 hover:bg-red-600/20 hover:scale-110 transition-all duration-200"
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
