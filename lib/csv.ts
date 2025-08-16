import type { HistoryRec } from './types';

/**
 * Convert milliseconds to HH:MM format
 */
function msToHhMm(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
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
export function downloadCSV(shifts: HistoryRec[]): void {
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
    'Tags',
    'Notes'
  ];

  // CSV rows
  const rows = shifts.map(shift => {
    const netHours = shift.netMs / 3600000;
    const targetDailyHours = 7; // 7 hours net work daily (excluding breaks)
    const overtimeHours = Math.max(0, netHours - targetDailyHours);
    const overtimeHhMm = `${Math.floor(overtimeHours)}:${Math.round((overtimeHours % 1) * 60).toString().padStart(2, '0')}`;
    
    return [
      formatDate(shift.startMs),
      formatTime(shift.startMs),
      formatTime(shift.endMs),
      msToHhMm(shift.endMs - shift.startMs),
      msToHhMm(shift.breakMs),
      msToHhMm(shift.netMs),
      overtimeHhMm,
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
export function downloadSummaryCSV(shifts: HistoryRec[]): void {
  if (shifts.length === 0) {
    alert('No shifts to export');
    return;
  }

  // Calculate totals
  const totalShifts = shifts.length;
  const totalNetMs = shifts.reduce((sum, shift) => sum + shift.netMs, 0);
  const totalBreakMs = shifts.reduce((sum, shift) => sum + shift.breakMs, 0);
  const totalGrossMs = shifts.reduce((sum, shift) => sum + (shift.endMs - shift.startMs), 0);
  
  const totalNetHours = Math.floor(totalNetMs / 3600000);
  const totalNetMinutes = Math.floor((totalNetMs % 3600000) / 60000);
  const totalBreakHours = Math.floor(totalBreakMs / 3600000);
  const totalBreakMinutes = Math.floor((totalBreakMs % 3600000) / 60000);
  
  // Calculate overtime
  const targetDailyHours = 7; // 7 hours net work daily (excluding breaks)
  const totalOvertimeHours = shifts.reduce((sum, shift) => {
    const shiftNetHours = shift.netMs / 3600000;
    const overtime = Math.max(0, shiftNetHours - targetDailyHours);
    return sum + overtime;
  }, 0);
  const totalOvertimeHoursWhole = Math.floor(totalOvertimeHours);
  const totalOvertimeMinutes = Math.round((totalOvertimeHours % 1) * 60);
  
  const averageShiftMs = totalNetMs / totalShifts;
  const averageShiftHours = Math.floor(averageShiftMs / 3600000);
  const averageShiftMinutes = Math.floor((averageShiftMs % 3600000) / 60000);

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
    `Total Net Working Time,${totalNetHours}h ${totalNetMinutes}m`,
    `Total Break Time,${totalBreakHours}h ${totalBreakMinutes}m`,
    `Total Overtime,${totalOvertimeHoursWhole}h ${totalOvertimeMinutes}m`,
    `Average Shift Length,${averageShiftHours}h ${averageShiftMinutes}m`,
    '',
    // Detailed shifts
    'Date,Start Time,End Time,Duration (HH:MM),Break Time (HH:MM),Net Working Time (HH:MM),Overtime (HH:MM),Tags,Notes',
    ...shifts.map(shift => {
      const netHours = shift.netMs / 3600000;
      const overtimeHours = Math.max(0, netHours - targetDailyHours);
      const overtimeHhMm = `${Math.floor(overtimeHours)}:${Math.round((overtimeHours % 1) * 60).toString().padStart(2, '0')}`;
      
      return [
        formatDate(shift.startMs),
        formatTime(shift.startMs),
        formatTime(shift.endMs),
        msToHhMm(shift.endMs - shift.startMs),
        msToHhMm(shift.breakMs),
        msToHhMm(shift.netMs),
        overtimeHhMm,
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
