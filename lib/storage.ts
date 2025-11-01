import type { Snapshot } from './types';

const CURRENT_SCHEMA = 1;

// Get storage key for a specific user
function getStorageKey(userId?: string): string {
  if (!userId) return 'shift-tracker:snapshot:anonymous';
  return `shift-tracker:snapshot:${userId}`;
}

export const defaultSnapshot = (): Snapshot => ({
  schemaVersion: CURRENT_SCHEMA,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  watch: { status: 'IDLE', startTimeMs: null, endTimeMs: null, breaks: [], targetMinutes: 420 },
  manual: { breaks: [] },
  history: [],
  prefs: { hourFormat: 24, theme: 'dark', targetMinutes: 420, autoSync: false, syncCode: '' },
});

export function loadLocal(userId?: string): Snapshot {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return defaultSnapshot();
    const parsed = JSON.parse(raw) as Snapshot;
    return migrate(parsed);
  } catch {
    return defaultSnapshot();
  }
}

export function saveLocal(snap: Snapshot, userId?: string) {
  try {
    const key = getStorageKey(userId);
    const next = { ...snap, updatedAt: Date.now(), schemaVersion: CURRENT_SCHEMA };
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

export function setSnapshot(next: Snapshot, userId?: string) { saveLocal(next, userId); }

export function updateSnapshot(updater: (cur: Snapshot) => Snapshot, userId?: string): Snapshot {
  const cur = loadLocal(userId);
  const next = updater(cur);
  saveLocal(next, userId);
  return next;
}

function migrate(input: Snapshot): Snapshot {
  if (!input || typeof input !== 'object') return defaultSnapshot();
  const out = { ...input };
  if (!('schemaVersion' in out) || typeof out.schemaVersion !== 'number') out.schemaVersion = 0;

  out.watch ??= defaultSnapshot().watch;
  out.manual ??= defaultSnapshot().manual;
  out.history ??= [];
  out.prefs ??= defaultSnapshot().prefs;

  // backfill new fields
  if (out.prefs.targetMinutes == null) out.prefs.targetMinutes = 420;
  if (out.prefs.autoSync == null) out.prefs.autoSync = false;
  if (out.prefs.syncCode == null) out.prefs.syncCode = '';

  out.schemaVersion = CURRENT_SCHEMA;
  return out;
}
