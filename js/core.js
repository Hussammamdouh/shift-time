// core.js — shared helpers, constants, formatting, tiny UX utils

// ===== Time constants =====
export const MS_PER_MIN = 60 * 1000;
export const MS_PER_HR  = 60 * MS_PER_MIN;

// ===== DOM helpers =====
export const $  = (q, r = document) => r.querySelector(q);
export const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));

// ===== App enums =====
export const State = { IDLE:'IDLE', WORKING:'WORKING', ON_BREAK:'ON_BREAK', ENDED:'ENDED' };

// ===== Formatting =====
export const pad2 = (n) => String(n).padStart(2,'0');

export function fmtHM(ms, gran=1){
  if (ms < 0) ms = 0;
  const totalMin = Math.round(ms / MS_PER_MIN / gran) * gran;
  const h = Math.floor(totalMin / 60); const m = totalMin % 60;
  return `${h}h ${m}m`;
}

// 24h / 12h clock
export function hhmmFromDate(date, use24){
  let h = date.getHours(), m = date.getMinutes();
  if (use24) return `${pad2(h)}:${pad2(m)}`;
  const ampm = h >= 12 ? 'PM':'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)} ${ampm}`;
}
export const hhmmFromMs = (ms, use24=true) => hhmmFromDate(new Date(ms), use24);

// ===== Parsing / math =====
export function parseTimeToDate(t){
  if(!t) return null;
  const d = new Date(`1970-01-01T${t}:00`);
  return isNaN(d.getTime()) ? null : d;
}
export function ensureForward(start, end){
  const s=new Date(start.getTime()), e=new Date(end.getTime());
  if(e < s) e.setDate(e.getDate()+1);
  return [s,e];
}
export function clampIntervalToShift(intStart, intEnd, shiftStart, shiftEnd){
  const start = new Date(Math.max(intStart.getTime(), shiftStart.getTime()));
  const end   = new Date(Math.min(intEnd.getTime(),   shiftEnd.getTime()));
  if(end <= start) return null;
  return [start,end];
}
export function overlapMs(aStart, aEnd, bStart, bEnd){
  const start = Math.max(aStart, bStart);
  const end   = Math.min(aEnd,   bEnd);
  return Math.max(0, end - start);
}

// datetime-local helpers
export function toDTLocal(ms){
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}
export function fromDTLocal(str){
  if (!str) return null;
  const ms = new Date(str).getTime();
  return isNaN(ms) ? null : ms;
}

// ===== Crypto =====
export async function sha256Hex(str){
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ===== Tiny UX niceties =====
export function notify(title, body){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted'){
    try { new Notification(title, { body }); } catch {}
  }
}

export function beep(enabled=true){
  if (!enabled) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.02;
  o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
}

// ===== Simple event bus =====
const BUS = new EventTarget();
export const on  = (type, fn) => BUS.addEventListener(type, fn);
export const off = (type, fn) => BUS.removeEventListener(type, fn);
export const emit = (type, detail) => BUS.dispatchEvent(new CustomEvent(type, { detail }));
