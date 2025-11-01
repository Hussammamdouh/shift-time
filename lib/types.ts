export type BreakRange = {
  startMs: number;
  endMs: number | null;
};

export type DeviceInfo = {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  lastSeen: number;
  isOnline: boolean;
  version?: string;
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
  projectId?: string; // Optional project assignment
  taskId?: string; // Optional task assignment
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
  hourlyRate?: number; // Regular hourly rate for billing calculations
  overtimeRate?: number; // Overtime hourly rate (separate from regular rate)
  overtimeThreshold?: number; // Hours after which overtime applies (default: 7)
  monthlySalary?: number; // Monthly salary for automatic hourly rate calculation
  currency?: string; // Currency for billing display
  vacationDate?: string; // Date picker for adding vacation days
  autoSync: boolean;
  syncCode: string;
  compactMode?: boolean; // Compact UI scale for mobile-like layout
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color for UI
  createdAt: number;
  updatedAt: number;
};

export type Task = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
};

export type Snapshot = {
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  watch: WatchState;
  manual: ManualState;
  history: HistoryRec[];
  prefs: Preferences;
  devices?: DeviceInfo[];
  currentDeviceId?: string;
  projects?: Project[]; // User's projects
  tasks?: Task[]; // User's tasks
  onboardingCompleted?: boolean; // Track if onboarding was completed
};
