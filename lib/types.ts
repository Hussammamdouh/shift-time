export type BreakRange = {
  startMs: number;
  endMs: number | null;
};

export type HistoryRec = {
  id: string;
  startMs: number;
  endMs: number;
  breaks: Required<BreakRange>[];
  breakMs: number;
  netMs: number;
  note: string;
  tags: string[];
};

export type WatchState = {
  status: 'IDLE' | 'WORKING' | 'ON_BREAK';
  startTimeMs: number | null;
  endTimeMs: number | null;
  breaks: BreakRange[];
  targetMinutes?: number;
};

export type ManualState = {
  breaks: BreakRange[];
};

export type Preferences = {
  hourFormat: 12 | 24;
  theme: 'dark' | 'light';
  targetMinutes?: number;
  hourlyRate?: number; // New: Hourly rate for billing calculations
  monthlySalary?: number; // New: Monthly salary for automatic hourly rate calculation
  currency?: string; // New: Currency for billing display
  vacationDate?: string; // New: Date picker for adding vacation days
  autoSync: boolean;
  syncCode: string;
};

export type Snapshot = {
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  watch: WatchState;
  manual: ManualState;
  history: HistoryRec[];
  prefs: Preferences;
};
