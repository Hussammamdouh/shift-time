// storage.js — state, load/save, schema & helpers
import { MS_PER_HR, overlapMs } from './core.js';

// Keys / versions
const K = {
  watch:   'shiftStopwatch.v3',
  manual:  'shiftManual.v3',
  history: 'shiftHistory.v2',   // now stores optional per-record breaks
  prefs:   'shiftPrefs.v2',
  lock:    'shiftLock.v2',
};

// Defaults
export const defaults = {
  watch:  { status:'IDLE', startTimeMs:null, endTimeMs:null, breaks:[] }, // breaks: {startMs,endMs|null}
  manual: { start:'', end:'', breaks:[] },
  prefs:  {
    targetHours:7, granularityMin:1, hourlyRate:0,
    use24h:true, pureBlack:false,
    nudges:{ notifications:false, sound:false, titleTicker:true, breakNudgeMin:20, targetNudge:'on' },
  },
  lock:   { enabled:false, salt:null, hash:null },
};

export const state = {
  watch:  structuredClone(defaults.watch),
  manual: structuredClone(defaults.manual),
  history: [],
  prefs:  structuredClone(defaults.prefs),
  lock:   structuredClone(defaults.lock),
};

// Load / Save
export function loadAll(){
  try { Object.assign(state.watch,  JSON.parse(localStorage.getItem(K.watch)  || '{}')); } catch {}
  try { Object.assign(state.manual, JSON.parse(localStorage.getItem(K.manual) || '{}')); } catch {}
  try { state.history = JSON.parse(localStorage.getItem(K.history) || '[]'); } catch { state.history = []; }
  try { Object.assign(state.prefs,  JSON.parse(localStorage.getItem(K.prefs)  || '{}')); } catch {}
  try { Object.assign(state.lock,   JSON.parse(localStorage.getItem(K.lock)   || '{}')); } catch {}
}
export function saveAll(){
  localStorage.setItem(K.watch,   JSON.stringify(state.watch));
  localStorage.setItem(K.manual,  JSON.stringify(state.manual));
  localStorage.setItem(K.history, JSON.stringify(state.history));
  localStorage.setItem(K.prefs,   JSON.stringify(state.prefs));
  localStorage.setItem(K.lock,    JSON.stringify(state.lock));
}

export function pushHistory(rec){
  state.history.push(rec);
  localStorage.setItem(K.history, JSON.stringify(state.history));
}

// Compute watch record on End
export function computeWatchRecord(){
  const w = state.watch;
  if (!w.startTimeMs || !w.endTimeMs) return null;
  let breakMs = 0;
  const breaks = [];
  for (const b of w.breaks){
    const e = b.endMs ?? w.endTimeMs;
    const ms = overlapMs(b.startMs, e, w.startTimeMs, w.endTimeMs);
    if (ms > 0){
      breaks.push({ startMs: Math.max(b.startMs, w.startTimeMs), endMs: Math.min(e, w.endTimeMs) });
      breakMs += ms;
    }
  }
  const netMs = Math.max(0, (w.endTimeMs - w.startTimeMs) - breakMs);
  return {
    dateISO: new Date(w.startTimeMs).toISOString().slice(0,10),
    mode: 'STOPWATCH',
    startMs: w.startTimeMs,
    endMs:   w.endTimeMs,
    breaks, breakMs, netMs,
    targetH: state.prefs.targetHours,
    rate:    state.prefs.hourlyRate
  };
}

export function earningsFromMs(ms){
  return state.prefs.hourlyRate * (ms / MS_PER_HR);
}
