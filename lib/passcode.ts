// Local-only numeric passcode lock (separate from sync passcode).
// Stores a salted hash in localStorage. Never stores raw passcodes.

const STORE_KEY = 'shift-lock:v1';
const SALT_KEY  = 'shift-lock:salt';

type LockState = {
  hash: string;   // hex SHA-256(salt + pass)
  enabled: boolean;
};

function getSalt(): string {
  let s = localStorage.getItem(SALT_KEY);
  if (!s) {
    s = crypto.getRandomValues(new Uint8Array(16)).reduce((a,b)=>a+b.toString(16).padStart(2,'0'),'');
    localStorage.setItem(SALT_KEY, s);
  }
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function loadLock(): LockState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { hash: '', enabled: false };
    return JSON.parse(raw) as LockState;
  } catch {
    return { hash: '', enabled: false };
  }
}

export function saveLock(state: LockState) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export async function setPasscode(numeric: string) {
  if (!/^\d{4,8}$/.test(numeric)) throw new Error('Passcode must be 4–8 digits.');
  const salt = getSalt();
  const hash = await sha256Hex(salt + numeric);
  saveLock({ hash, enabled: true });
}

export async function verifyPasscode(numeric: string): Promise<boolean> {
  const { hash, enabled } = loadLock();
  if (!enabled || !hash) return true; // unlocked if not enabled
  const salt = getSalt();
  const h = await sha256Hex(salt + numeric);
  return h === hash;
}

export function disableLock() {
  saveLock({ hash: '', enabled: false });
}

export function isLockEnabled(): boolean {
  const { enabled, hash } = loadLock();
  return enabled && !!hash;
}
