import type { HistoryRec, Preferences } from './types';

/**
 * Convert milliseconds to HHhours:MMminutes format
 */
function msToHhMm(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Convert decimal hours to HHhours:MMminutes format
 */
function hoursToText(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Format date for CSV
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format time for CSV
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Escape CSV field to prevent injection
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Convert shifts to CSV format and trigger download
 */
export function downloadCSV(shifts: HistoryRec[], preferences?: Preferences): void {
  if (shifts.length === 0) {
    alert('No shifts to export');
    return;
  }

  // CSV headers
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Duration (HH:MM)',
    'Break Time (HH:MM)',
    'Net Working Time (HH:MM)',
    'Overtime (HH:MM)',
    'Hourly Rate',
    'Earnings',
    'Tags',
    'Notes'
  ];

  // CSV rows
  const rows = shifts.map(shift => {
    const netHours = shift.netMs / 3600000;
    const targetDailyHours = 7; // 7 hours net work daily (excluding breaks)
    const overtimeHours = Math.max(0, netHours - targetDailyHours);
    const overtimeHhMm = hoursToText(overtimeHours);
    
    // Calculate earnings using preferences hourly rate
    const hourlyRate = preferences?.hourlyRate || 0;
    const earnings = hourlyRate > 0 ? netHours * hourlyRate : 0;
    
    return [
      formatDate(shift.startMs),
      formatTime(shift.startMs),
      formatTime(shift.endMs),
      msToHhMm(shift.endMs - shift.startMs),
      msToHhMm(shift.breakMs),
      msToHhMm(shift.netMs),
      overtimeHhMm,
      hourlyRate > 0 ? hourlyRate.toFixed(2) : 'N/A',
      earnings > 0 ? earnings.toFixed(2) : 'N/A',
      (shift.tags || []).join('; '),
      shift.note || ''
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvField).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    alert('Download not supported in this browser. Copy the data manually:\n\n' + csvContent);
  }
}

/**
 * Generate summary CSV with totals and statistics
 */
export function downloadSummaryCSV(shifts: HistoryRec[], preferences?: Preferences): void {
  if (shifts.length === 0) {
    alert('No shifts to export');
    return;
  }

  // Calculate summary statistics
  const totalShifts = shifts.length;
  const totalNetHours = shifts.reduce((a, r) => a + r.netMs, 0) / 3600000;
  const totalBreakHours = shifts.reduce((a, r) => a + r.breakMs, 0) / 3600000;
  const totalOvertimeHours = shifts.reduce((a, r) => {
    const shiftNetHours = r.netMs / 3600000;
    const overtime = Math.max(0, shiftNetHours - 7);
    return a + overtime;
  }, 0);
  
  // Calculate earnings
  const hourlyRate = preferences?.hourlyRate || 0;
  const totalEarnings = hourlyRate > 0 ? totalNetHours * hourlyRate : 0;

  // CSV content
  const csvContent = [
    // Summary section
    'SHIFT TRACKER SUMMARY REPORT',
    `Generated on: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    '',
    'SUMMARY STATISTICS',
    `Total Shifts,${totalShifts}`,
    `Total Net Working Time,${hoursToText(totalNetHours)}`,
    `Total Break Time,${hoursToText(totalBreakHours)}`,
    `Total Overtime,${hoursToText(totalOvertimeHours)}`,
    `Hourly Rate,${hourlyRate > 0 ? hourlyRate.toFixed(2) : 'N/A'}`,
    `Total Earnings,${totalEarnings > 0 ? totalEarnings.toFixed(2) : 'N/A'}`,
    `Average Shift Length,${hoursToText((shifts.reduce((a, r) => a + r.netMs, 0) / 3600000) / totalShifts)}`,
    '',
    // Detailed shifts
    'Date,Start Time,End Time,Duration (HH:MM),Break Time (HH:MM),Net Working Time (HH:MM),Overtime (HH:MM),Hourly Rate,Earnings,Tags,Notes',
    ...shifts.map(shift => {
      const netHours = shift.netMs / 3600000;
      const overtimeHours = Math.max(0, netHours - 7);
      const overtimeHhMm = hoursToText(overtimeHours);
      const shiftEarnings = hourlyRate > 0 ? netHours * hourlyRate : 0;
      
      return [
        formatDate(shift.startMs),
        formatTime(shift.startMs),
        formatTime(shift.endMs),
        msToHhMm(shift.endMs - shift.startMs),
        msToHhMm(shift.breakMs),
        msToHhMm(shift.netMs),
        overtimeHhMm,
        hourlyRate > 0 ? hourlyRate.toFixed(2) : 'N/A',
        shiftEarnings > 0 ? shiftEarnings.toFixed(2) : 'N/A',
        (shift.tags || []).join('; '),
        shift.note || ''
      ].map(escapeCsvField).join(',');
    })
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shift-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    alert('Download not supported in this browser. Copy the data manually:\n\n' + csvContent);
  }
}

/**
 * Export shifts with both human-readable and raw data for perfect import compatibility
 * This ensures the exported CSV can be imported on any device without data loss
 */
export function downloadCompatibleCSV(shifts: HistoryRec[], preferences?: Preferences): void {
  if (shifts.length === 0) {
    alert('No shifts to export');
    return;
  }

  // CSV headers - Include both human-readable and raw data
  const headers = [
    // Raw data for perfect import (primary)
    'startms',
    'endms', 
    'netms',
    'breakms',
    'note',
    'tags',
    // Human-readable data for viewing (secondary)
    'date',
    'start_time',
    'end_time',
    'duration_hhmm',
    'break_time_hhmm',
    'net_working_hhmm',
    'overtime_hhmm',
    'hourly_rate',
    'earnings'
  ];

  // CSV rows
  const rows = shifts.map(shift => {
    const netHours = shift.netMs / 3600000;
    const targetDailyHours = 7;
    const overtimeHours = Math.max(0, netHours - targetDailyHours);
    const overtimeHhMm = `${Math.floor(overtimeHours)}:${Math.round((overtimeHours % 1) * 60).toString().padStart(2, '0')}`;
    
    // Calculate earnings using preferences hourly rate
    const hourlyRate = preferences?.hourlyRate || 0;
    const earnings = hourlyRate > 0 ? netHours * hourlyRate : 0;
    
    return [
      // Raw data (primary for import)
      shift.startMs.toString(),
      shift.endMs.toString(),
      shift.netMs.toString(),
      shift.breakMs.toString(),
      shift.note || '',
      (shift.tags || []).join('; '),
      // Human-readable data (secondary for viewing)
      formatDate(shift.startMs),
      formatTime(shift.startMs),
      formatTime(shift.endMs),
      msToHhMm(shift.endMs - shift.startMs),
      msToHhMm(shift.breakMs),
      msToHhMm(shift.netMs),
      overtimeHhMm,
      hourlyRate > 0 ? hourlyRate.toFixed(2) : 'N/A',
      earnings > 0 ? earnings.toFixed(2) : 'N/A'
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvField).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts-compatible-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    alert('Download not supported in this browser. Copy the data manually:\n\n' + csvContent);
  }
}
