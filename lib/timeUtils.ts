// Time & shift math utilities for Stopwatch + Manual + Reporting
// These helpers are pure and framework-agnostic.

export type Ms = number;
export type BreakRange = { startMs: Ms; endMs: Ms | null }; // endMs null = ongoing break

/** Round a timestamp to nearest minute (down by default) */
export function floorToMinute(ms: Ms): Ms {
  return Math.floor(ms / 60000) * 60000;
}

/** Convert datetime-local string <-> ms (local timezone) */
export function fromLocalDT(value: string): Ms | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
export function toLocalDT(ms: Ms | null | undefined): string {
  if (!ms) return '';
  const d = new Date(ms);
  // Make it local-friendly
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Convert milliseconds to hours and minutes */
export function msToHhMm(ms: number): { hh: number; mm: number; text: string; hours: number } {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const hours = ms / 3600000; // Decimal hours for calculations
  
  return {
    hh,
    mm,
    text: `${hh}:${mm.toString().padStart(2, '0')}`,
    hours
  };
}

/** Convert milliseconds to decimal hours */
export function msToHours(ms: number): number {
  return ms / 3600000;
}

/** Convert decimal hours to formatted string */
export function hoursToText(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}

/** Format timestamp as clock time */
export function fmtClock(timestamp: number, hourFormat: 12 | 24 = 24): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hourFormat === 12
  });
}

/** Validate a time range */
export function isValidRange(startMs: Ms | null, endMs: Ms | null): boolean {
  if (startMs == null || endMs == null) return false;
  return endMs > startMs;
}

/** Normalize breaks to ensure they have end times */
export function normalizeBreaks(breaks: { startMs: number; endMs: number | null }[], shiftEnd: number) {
  return breaks.map(b => ({
    startMs: b.startMs,
    endMs: b.endMs ?? shiftEnd
  }));
}

/** Clamp breaks to shift boundaries */
export function clampBreaksToShift(shiftStart: number, shiftEnd: number, breaks: Required<{ startMs: number; endMs: number }>[]) {
  return breaks.map(b => ({
    startMs: Math.max(shiftStart, b.startMs),
    endMs: Math.min(shiftEnd, b.endMs)
  }));
}

/** Sum total break ms (requires finite endMs) */
export function sumBreakMs(breaks: Required<{ startMs: number; endMs: number }>[]): number {
  return breaks.reduce((acc, b) => acc + (b.endMs - b.startMs), 0);
}

/** Compute net working time excluding breaks */
export function computeNetMs(startMs: number, endMs: number, breaks: { startMs: number; endMs: number | null }[]): number {
  const totalMs = endMs - startMs;
  const breakMs = breaks.reduce((acc, b) => {
    if (b.endMs === null) return acc;
    return acc + (b.endMs - b.startMs);
  }, 0);
  return Math.max(0, totalMs - breakMs);
}

/** Live working time for an ongoing shift (with optional ongoing break) */
export function computeLiveWorkingMs(
  shiftStart: Ms | null,
  status: 'IDLE' | 'WORKING' | 'ON_BREAK' | 'ENDED',
  breaks: BreakRange[],
  now: Ms = Date.now()
): Ms {
  if (!shiftStart) return 0;
  const end = status === 'ENDED' ? now /* call with end instead of now if known */ : now;
  return computeNetMs(shiftStart, end, breaks);
}

/** Calculate earnings based on hours worked and hourly rate */
export function calculateEarnings(hours: number, hourlyRate: number): number {
  return hours * hourlyRate;
}

/** Format currency for display */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/** Pretty, human summary for a shift */
export function shiftSummary(
  shiftStart: number,
  shiftEnd: number,
  breaks: { startMs: number; endMs: number | null }[],
  hourFormat: 12 | 24 = 24,
  hourlyRate?: number,
  currency: string = 'USD'
) {
  const netMs = computeNetMs(shiftStart, shiftEnd, breaks);
  const normalized = normalizeBreaks(breaks, shiftEnd);
  // Filter out breaks with null endMs before clamping
  const validBreaks = normalized.filter((b): b is Required<{ startMs: number; endMs: number }> => b.endMs !== null);
  const trimmed = clampBreaksToShift(shiftStart, shiftEnd, validBreaks);
  const breakMs = sumBreakMs(trimmed);

  // Create breaks array with explicit type checking
  const breaksSummary = trimmed.map(b => {
    // At this point, b.endMs is guaranteed to be non-null due to the filter above
    const endMs = b.endMs!;
    return {
      start: fmtClock(b.startMs, hourFormat),
      end: fmtClock(endMs, hourFormat),
      dur: hoursToText(msToHours(endMs - b.startMs)),
    };
  });

  const netHours = msToHours(netMs);
  const breakHours = msToHours(breakMs);
  
  // Calculate overtime (hours beyond 7 hours per day)
  const targetDailyHours = 7; // 7 hours net work daily (excluding breaks)
  const overtimeHours = Math.max(0, netHours - targetDailyHours);
  const overtime = hoursToText(overtimeHours);
  
  const earnings = hourlyRate ? calculateEarnings(netHours, hourlyRate) : undefined;

  return {
    start: fmtClock(shiftStart, hourFormat),
    end: fmtClock(shiftEnd, hourFormat),
    net: hoursToText(netHours),
    breakTotal: hoursToText(breakHours),
    overtime,
    overtimeHours,
    breaks: breaksSummary,
    netMs,
    breakMs,
    netHours,
    breakHours,
    earnings: earnings ? formatCurrency(earnings, currency) : undefined,
    rawEarnings: earnings
  };
}
