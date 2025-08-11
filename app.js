// ===== Constants & helpers =====
const MS_PER_MIN = 60 * 1000;
const MS_PER_HR  = 60 * MS_PER_MIN;

const $  = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const State = { IDLE:'IDLE', WORKING:'WORKING', ON_BREAK:'ON_BREAK', ENDED:'ENDED' };

function pad2(n){ return String(n).padStart(2,'0'); }
function fmtHM(ms, gran=1){
  if (ms < 0) ms = 0;
  const totalMin = Math.round(ms / MS_PER_MIN / gran) * gran;
  const h = Math.floor(totalMin / 60); const m = totalMin % 60;
  return `${h}h ${m}m`;
}
function parseTimeToDate(t){
  if(!t) return null;
  const d = new Date(`1970-01-01T${t}:00`);
  return isNaN(d.getTime()) ? null : d;
}
function ensureForward(start, end){
  const s=new Date(start.getTime()), e=new Date(end.getTime());
  if(e < s) e.setDate(e.getDate()+1);
  return [s,e];
}
function clampIntervalToShift(intStart, intEnd, shiftStart, shiftEnd){
  const start = new Date(Math.max(intStart.getTime(), shiftStart.getTime()));
  const end   = new Date(Math.min(intEnd.getTime(),   shiftEnd.getTime()));
  if(end <= start) return null;
  return [start,end];
}
function overlapMs(aStart, aEnd, bStart, bEnd){
  const start = Math.max(aStart, bStart);
  const end   = Math.min(aEnd,   bEnd);
  return Math.max(0, end - start);
}

// Time formatting (12/24)
function hhmmFromDate(date, use24){
  let h = date.getHours(), m = date.getMinutes();
  if (use24) return `${pad2(h)}:${pad2(m)}`;
  const ampm = h >= 12 ? 'PM':'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${pad2(h)}:${pad2(m)} ${ampm}`;
}
function hhmmFromMs(ms, use24=true){ return hhmmFromDate(new Date(ms), use24); }

// ===== Storage keys =====
const STORE_WATCH   = 'shiftStopwatch.v2';
const STORE_MANUAL  = 'shiftManual.v2';
const STORE_HISTORY = 'shiftHistory.v1';
const STORE_PREFS   = 'shiftPrefs.v1';
const STORE_LOCK    = 'shiftLock.v1';

// ===== App state =====
let watch = {
  status: State.IDLE,
  startTimeMs: null,
  endTimeMs: null,
  breaks: [], // {startMs, endMs|null}
};
let manual = {
  start: '',
  end: '',
  breaks: [], // [{start:'HH:MM', end:'HH:MM'}]
};
let history = []; // array of {dateISO, mode, startMs, endMs, breakMs, netMs, targetH, rate}
let prefs = {
  targetHours: 7,
  granularityMin: 1,
  hourlyRate: 0,
  use24h: true,
  pureBlack: false,
  nudges: { notifications:false, sound:false, titleTicker:true, breakNudgeMin:20, targetNudge:'on' },
};
let lock = { enabled:false, salt:null, hash:null }; // hash of numeric passcode

// ===== Load / Save =====
function save(){
  localStorage.setItem(STORE_WATCH,   JSON.stringify(watch));
  localStorage.setItem(STORE_MANUAL,  JSON.stringify(manual));
  localStorage.setItem(STORE_HISTORY, JSON.stringify(history));
  localStorage.setItem(STORE_PREFS,   JSON.stringify(prefs));
  localStorage.setItem(STORE_LOCK,    JSON.stringify(lock));
}
function load(){
  try{ Object.assign(watch,   JSON.parse(localStorage.getItem(STORE_WATCH)   || '{}')); }catch(e){}
  try{ Object.assign(manual,  JSON.parse(localStorage.getItem(STORE_MANUAL)  || '{}')); }catch(e){}
  try{ history = JSON.parse(localStorage.getItem(STORE_HISTORY) || '[]'); }catch(e){}
  try{ Object.assign(prefs,   JSON.parse(localStorage.getItem(STORE_PREFS)   || '{}')); }catch(e){}
  try{ Object.assign(lock,    JSON.parse(localStorage.getItem(STORE_LOCK)    || '{}')); }catch(e){}
}

// ===== Crypto (hash) =====
async function sha256Hex(str){
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function setPasscode(passDigits){
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const saltHex = Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  const hash = await sha256Hex(saltHex + passDigits);
  lock = { enabled:true, salt:saltHex, hash };
  save();
}
async function verifyPasscode(passDigits){
  if (!lock.enabled || !lock.salt || !lock.hash) return false;
  const h = await sha256Hex(lock.salt + passDigits);
  return h === lock.hash;
}

// ===== Elements (common) =====
const tabWatch = $('#tabWatch'), tabManual = $('#tabManual'), tabReport = $('#tabReport');
const modeWatch = $('#modeWatch'), modeManual = $('#modeManual'), modeReport = $('#modeReport');

const fmtToggle = $('#fmtToggle');
const pureBlackToggle = $('#pureBlackToggle');
const settingsBtn = $('#settingsBtn');
const settingsPanel = $('#settingsPanel');
$('#closeSettings').addEventListener('click', ()=> settingsPanel.classList.add('hidden'));

// Settings — lock controls
const enablePass = $('#enablePass');
const changePass = $('#changePass');
const disablePass = $('#disablePass');

const notifToggle = $('#notifToggle');
const soundToggle = $('#soundToggle');
const titleTickerToggle = $('#titleTickerToggle');
const breakNudgeMin = $('#breakNudgeMin');
const targetNudge = $('#targetNudge');

// Shared controls
const targetIn = $('#targetHours');
const granIn   = $('#granularity');
const rateIn   = $('#hourlyRate');
const statusTag = $('#statusTag');
const resultsBox = $('#results');
const kpi = {
  raw: $('#kpiRaw'), brk: $('#kpiBreaks'), net: $('#kpiNet'),
  tgt: $('#kpiTarget'), rem: $('#kpiRemain'), over: $('#kpiOver'),
  suggest: $('#kpiSuggest'), state: $('#kpiState'),
};
const breakListRender = $('#breakListRender');
const endNote = $('#endNote');

// Stopwatch
const nowClock   = $('#nowClock');
const stateBadge = $('#stateBadge');
const tickerPill = $('#tickerPill');
const btnStart = $('#btnStart'), btnBreak = $('#btnBreak'), btnBack = $('#btnBack'), btnEnd = $('#btnEnd'), btnReset = $('#btnReset');
const watchStartInput = $('#watchStart'), watchEndInput = $('#watchEnd'), watchBreaksList = $('#watchBreaksList');

// Manual
const startInput = $('#startTime'), endInput = $('#endTime'), breaksContainer = $('#breaks');
const addBreakBtn = $('#addBreakBtn'), clearBreaksBtn = $('#clearBreaksBtn'), manualSaveBtn = $('#manualSave');

// Reporting
const reportSpan = $('#reportSpan'), reportStart = $('#reportStart'), reportEnd = $('#reportEnd');
const repSessions = $('#repSessions'), repTotalNet = $('#repTotalNet'), repAvgDay = $('#repAvgDay'), repEarnings = $('#repEarnings');
const historyTable = $('#historyTable');
const btnExportCsv = $('#btnExportCsv'), btnPrint = $('#btnPrint');

// Lock overlays
const lockOverlay = $('#lockOverlay');
const unlockDots = $('#unlockDots');
const unlockMsg = $('#unlockMsg');
$('#unlockClear').addEventListener('click', ()=> passBuffers.unlock = [] );

const setPassModal = $('#setPassModal');
const setDots = $('#setDots');
const setMsg = $('#setMsg');
const setConfirm = $('#setConfirm');
$('#setClear').addEventListener('click', ()=> passBuffers.set = [] );

// ===== Mode switching =====
function switchMode(which){
  [tabWatch, tabManual, tabReport].forEach(t => t.classList.remove('active'));
  [modeWatch, modeManual, modeReport].forEach(m => m.classList.add('hidden'));
  if (which === 'watch'){ tabWatch.classList.add('active'); modeWatch.classList.remove('hidden'); }
  if (which === 'manual'){ tabManual.classList.add('active'); modeManual.classList.remove('hidden'); }
  if (which === 'report'){ tabReport.classList.add('active'); modeReport.classList.remove('hidden'); renderReport(); }
  fullRender();
}
tabWatch.addEventListener('click', ()=> switchMode('watch'));
tabManual.addEventListener('click', ()=> switchMode('manual'));
tabReport.addEventListener('click', ()=> switchMode('report'));

// ===== UI setup (toggles) =====
fmtToggle.addEventListener('change', ()=>{ prefs.use24h = fmtToggle.checked; save(); fullRender(); });
pureBlackToggle.addEventListener('change', ()=>{
  prefs.pureBlack = pureBlackToggle.checked; document.body.classList.toggle('pure-black', prefs.pureBlack); save();
});
settingsBtn.addEventListener('click', ()=> settingsPanel.classList.toggle('hidden'));

// Nudges prefs
notifToggle.addEventListener('change', async ()=>{
  prefs.nudges.notifications = notifToggle.checked;
  save();
  if (prefs.nudges.notifications && Notification && Notification.permission !== 'granted'){
    try{ await Notification.requestPermission(); }catch{}
  }
});
soundToggle.addEventListener('change', ()=>{ prefs.nudges.sound = soundToggle.checked; save(); });
titleTickerToggle.addEventListener('change', ()=>{ prefs.nudges.titleTicker = titleTickerToggle.checked; save(); });
breakNudgeMin.addEventListener('input', ()=>{ prefs.nudges.breakNudgeMin = Math.max(5, Number(breakNudgeMin.value)||20); save(); });
targetNudge.addEventListener('change', ()=>{ prefs.nudges.targetNudge = targetNudge.value; save(); });

// Shared inputs
$('#calcBtn').addEventListener('click', ()=>{ savePrefsFromInputs(); fullRender(); });
targetIn.addEventListener('input', ()=> savePrefsFromInputs());
granIn.addEventListener('input',   ()=> savePrefsFromInputs());
rateIn.addEventListener('input',   ()=> savePrefsFromInputs());
function savePrefsFromInputs(){
  prefs.targetHours   = Math.max(0, Number(targetIn.value)||0);
  prefs.granularityMin= Math.max(1, Number(granIn.value)||1);
  prefs.hourlyRate    = Math.max(0, Number(rateIn.value)||0);
  save();
}

// ===== Stopwatch UI =====
function renderWatchHeader(){ stateBadge.textContent = watch.status; }
function renderWatchFormTimes(){
  watchStartInput.value = watch.startTimeMs ? toInputTime(watch.startTimeMs) : '';
  watchEndInput.value   = watch.endTimeMs   ? toInputTime(watch.endTimeMs)   : '';
}
function renderWatchBreaks(){
  watchBreaksList.innerHTML = '';
  if (watch.breaks.length === 0){
    const empty = document.createElement('div');
    empty.className = 'pill'; empty.textContent = 'No breaks yet';
    watchBreaksList.appendChild(empty);
    return;
  }
  watch.breaks.forEach((b, i)=>{
    const div = document.createElement('div');
    div.className = 'break-card';
    const dur = (b.endMs ?? Date.now()) - b.startMs;
    div.innerHTML = `
      <div class="break-head">
        <span>Break ${i+1}</span>
        <span class="break-dur" data-idx="${i}">${fmtHM(dur, 1)}</span>
      </div>
      <div class="foot-note">From <b>${hhmmFromMs(b.startMs, prefs.use24h)}</b> to <b>${b.endMs ? hhmmFromMs(b.endMs, prefs.use24h) : '— (active)'}</b></div>
    `;
    watchBreaksList.appendChild(div);
  });
}
function updateWatchButtons(){
  const disable = (el, flag)=> el.classList.toggle('btn-disabled', !!flag);
  if (watch.status === State.IDLE){
    disable(btnStart, false); disable(btnBreak, true); disable(btnBack, true); disable(btnEnd, true);
  } else if (watch.status === State.WORKING){
    disable(btnStart, true); disable(btnBreak, false); disable(btnBack, true); disable(btnEnd, false);
  } else if (watch.status === State.ON_BREAK){
    disable(btnStart, true); disable(btnBreak, true); disable(btnBack, false); disable(btnEnd, false);
  } else if (watch.status === State.ENDED){
    disable(btnStart, false); disable(btnBreak, true); disable(btnBack, true); disable(btnEnd, true);
  }
}
function toInputTime(ms){
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ===== Manual UI =====
function addBreakRow(vals = { start:'', end:'' }){
  const id = Math.random().toString(36).slice(2,7);
  const el = document.createElement('div');
  el.className = 'break-card';
  el.innerHTML = `
    <div class="break-head">
      <strong>Break</strong>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-dup="${id}" title="Duplicate">⎘</button>
        <button class="btn btn-danger" type="button" data-del="${id}" title="Remove">✕</button>
      </div>
    </div>
    <div class="grid g2" style="align-items:end">
      <div>
        <label for="bstart-${id}">Start</label>
        <input type="time" id="bstart-${id}" class="break-start" value="${vals.start||''}" />
      </div>
      <div>
        <label for="bend-${id}">End</label>
        <input type="time" id="bend-${id}" class="break-end" value="${vals.end||''}" />
      </div>
    </div>
    <div class="foot-note"><b>Duration:</b> <span class="break-dur">—</span></div>
  `;
  breaksContainer.appendChild(el);

  const startIn = el.querySelector('.break-start');
  const endIn   = el.querySelector('.break-end');
  const durEl   = el.querySelector('.break-dur');

  const updateDur = ()=>{
    const s = parseTimeToDate(startIn.value);
    const e = parseTimeToDate(endIn.value);
    if (!s || !e){ durEl.textContent = '—'; return; }
    const [ss,ee] = ensureForward(s,e);
    durEl.textContent = fmtHM(ee-ss, 1);
  };

  const persist = ()=>{
    manual.breaks = getManualBreaks();
    save();
  };

  startIn.addEventListener('input', ()=>{ updateDur(); triggerCalc(); persist(); });
  endIn.addEventListener('input',   ()=>{ updateDur(); triggerCalc(); persist(); });

  el.querySelector(`[data-del="${id}"]`).addEventListener('click', ()=>{
    el.remove(); manual.breaks = getManualBreaks(); save(); triggerCalc();
  });
  el.querySelector(`[data-dup="${id}"]`).addEventListener('click', ()=>{
    addBreakRow({ start:startIn.value, end:endIn.value }); manual.breaks = getManualBreaks(); save(); triggerCalc();
  });

  updateDur();
}
function renderManualFromState(){
  startInput.value = manual.start || '';
  endInput.value   = manual.end   || '';
  breaksContainer.innerHTML = '';
  if (manual.breaks && manual.breaks.length) manual.breaks.forEach(b => addBreakRow(b));
  else addBreakRow();
}
function getManualBreaks(){
  return $$('.break-card').map(card=>{
    const bs = card.querySelector('.break-start').value;
    const be = card.querySelector('.break-end').value;
    return { start: bs || '', end: be || '' };
  });
}

// ===== KPIs (shared) =====
function calcManual(){
  const startVal = startInput.value;
  const endVal   = endInput.value;
  const targetH  = Math.max(0, prefs.targetHours);
  const granMin  = Math.max(1, prefs.granularityMin);

  statusTag.textContent = 'Calculating…';

  const start = parseTimeToDate(startVal);
  if(!start){ resultsBox.style.display = 'none'; statusTag.textContent = 'Enter a start time'; return; }

  let end = endVal ? parseTimeToDate(endVal) : null;
  if(end){ [, end] = ensureForward(start, end); }

  const rows = getManualBreaks();
  const breaks = rows.map(r => {
    const bs = parseTimeToDate(r.start);
    const be = parseTimeToDate(r.end);
    if (!bs || !be) return null;
    const [bStart, bEnd] = ensureForward(bs, be);
    return { start: bStart, end: bEnd };
  }).filter(Boolean);

  const targetMs = targetH * MS_PER_HR;
  let rawShiftMs, breakMs=0, netMs, suggestedEnd=null;

  if (end){
    rawShiftMs = end - start;
    for(const br of breaks){
      const overl = clampIntervalToShift(br.start, br.end, start, end);
      if (overl) breakMs += (overl[1] - overl[0]);
    }
    netMs = Math.max(0, rawShiftMs - breakMs);

    if (netMs < targetMs){
      let needed = targetMs - netMs;
      let candidate = new Date(end.getTime() + needed);
      let changed;
      do{
        changed = false;
        for(const br of breaks){
          const overl = clampIntervalToShift(br.start, br.end, start, candidate);
          if (!overl) continue;
          const extendStart = new Date(Math.max(overl[0].getTime(), end.getTime()));
          if (extendStart < overl[1]){
            const add = overl[1] - extendStart;
            candidate = new Date(candidate.getTime() + add);
            changed = true;
          }
        }
      } while(changed);
      suggestedEnd = hhmmFromMs(candidate.getTime(), prefs.use24h);
    }
  } else {
    // Suggest end if not provided
    const totalBreakMs = breaks.reduce((a,b)=> a + (b.end - b.start), 0);
    let requiredEnd = new Date(start.getTime() + targetMs + totalBreakMs);
    let changed;
    do{
      changed = false;
      for (const br of breaks){
        const overl = clampIntervalToShift(br.start, br.end, start, requiredEnd);
        if (overl && requiredEnd > overl[0] && requiredEnd < overl[1]){
          requiredEnd = new Date(overl[1].getTime());
          changed = true;
        }
      }
    } while(changed);
    suggestedEnd = hhmmFromMs(requiredEnd.getTime(), prefs.use24h);

    rawShiftMs = null; breakMs = totalBreakMs; netMs = null;
  }

  // Render (manual)
  resultsBox.style.display = 'grid';
  kpi.raw.textContent   = rawShiftMs == null ? '—' : fmtHM(rawShiftMs, granMin);
  kpi.brk.textContent   = fmtHM(breakMs, granMin);
  kpi.net.textContent   = netMs == null ? '—' : fmtHM(netMs, granMin);
  kpi.tgt.textContent   = fmtHM(targetMs, granMin);

  if (netMs == null){ kpi.rem.textContent = '—'; kpi.over.textContent = '—'; }
  else {
    const diff = netMs - targetMs;
    kpi.rem.textContent = diff < 0 ? fmtHM(-diff, granMin) : '—';
    kpi.over.textContent = diff > 0 ? fmtHM(diff,  granMin) : '—';
  }
  kpi.suggest.textContent = suggestedEnd || '—';
  kpi.state.textContent   = 'MANUAL';

  // Break summary list
  if(!breaks.length){
    breakListRender.innerHTML = `<div class="tag">No breaks added</div>`;
  } else {
    breakListRender.innerHTML = breaks.map((b,i)=>`
      <div class="break-card">
        <div class="break-head">
          <span>Break ${i+1}</span>
          <span class="break-dur">${fmtHM(b.end-b.start,1)}</span>
        </div>
        <div class="foot-note">From <b>${hhmmFromMs(b.start.getTime(), prefs.use24h)}</b> to <b>${hhmmFromMs(b.end.getTime(), prefs.use24h)}</b></div>
      </div>
    `).join('');
  }
  endNote.innerHTML = (!endVal && suggestedEnd)
    ? `Suggested End Time to meet target: <b>${suggestedEnd}</b>.`
    : (endVal && netMs != null && (netMs < targetMs) && suggestedEnd)
      ? `To hit your target, you would need to stay until <b>${suggestedEnd}</b>.`
      : '';

  statusTag.textContent = 'Calculated';
}

function calcWatch(sendNudges=true){
  const gran = Math.max(1, prefs.granularityMin);
  const targetMs = (Number(prefs.targetHours)||0) * MS_PER_HR;

  if (!watch.startTimeMs){ resultsBox.style.display = 'none'; return; }

  const shiftStart = watch.startTimeMs;
  const shiftEnd = (watch.status === State.ENDED && watch.endTimeMs) ? watch.endTimeMs : Date.now();
  const rawShiftMs = Math.max(0, shiftEnd - shiftStart);

  let breakMs = 0;
  for (const b of watch.breaks){
    const bEnd = (b.endMs ?? Date.now());
    breakMs += overlapMs(b.startMs, bEnd, shiftStart, shiftEnd);
  }
  const netMs = Math.max(0, rawShiftMs - breakMs);

  // Remaining / Overtime
  const diff = netMs - targetMs;
  const remainingText = diff < 0 ? fmtHM(-diff, gran) : '—';
  const overtimeText  = diff > 0 ? fmtHM(diff, gran)  : '—';

  // Suggested end (if not ended)
  let suggestedEndText = '—';
  if (watch.status !== State.ENDED && targetMs > 0){
    const need = Math.max(0, targetMs - netMs);
    suggestedEndText = hhmmFromMs(Date.now() + need, prefs.use24h);
  }

  // Render (watch)
  resultsBox.style.display = 'grid';
  kpi.raw.textContent  = fmtHM(rawShiftMs, gran);
  kpi.brk.textContent  = fmtHM(breakMs, gran);
  kpi.net.textContent  = fmtHM(netMs, gran);
  kpi.tgt.textContent  = fmtHM(targetMs, gran);
  kpi.rem.textContent  = remainingText;
  kpi.over.textContent = overtimeText;
  kpi.suggest.textContent = suggestedEndText;
  kpi.state.textContent   = `STOPWATCH • ${watch.status}`;

  // Break summary
  if(!watch.breaks.length){
    breakListRender.innerHTML = `<div class="tag">No breaks yet</div>`;
  } else {
    breakListRender.innerHTML = watch.breaks.map((b,i)=>`
      <div class="break-card">
        <div class="break-head">
          <span>Break ${i+1}</span>
          <span class="break-dur">${fmtHM((b.endMs ?? Date.now())-b.startMs,1)}</span>
        </div>
        <div class="foot-note">From <b>${hhmmFromMs(b.startMs, prefs.use24h)}</b> to <b>${b.endMs ? hhmmFromMs(b.endMs, prefs.use24h) : '— (active)'}</b></div>
      </div>
    `).join('');
  }
  endNote.innerHTML = (watch.status !== State.ENDED && suggestedEndText !== '—')
    ? `Suggested End Time to meet target: <b>${suggestedEndText}</b>.`
    : '';

  // Title ticker
  if (prefs.nudges.titleTicker){
    document.title = `${fmtHM(netMs, 1)} • ${watch.status} — Shift Time`;
    $('#tickerPill').textContent = `Net ${fmtHM(netMs,1)}`;
  }

  // Nudges
  if (sendNudges){
    maybeNudgeTarget(netMs, targetMs);
    maybeNudgeBreak();
  }
}

// Nudges
let nudgeFlags = { targetSent:false, breakWarnSent:false };
function maybeNudgeTarget(netMs, targetMs){
  if (prefs.nudges.targetNudge !== 'on' || !prefs.nudges.notifications) return;
  if (targetMs <= 0) return;
  if (!nudgeFlags.targetSent && netMs >= targetMs){
    nudgeFlags.targetSent = true;
    notify('Target reached 🎉', `You’ve worked ${fmtHM(netMs,1)} (>= ${fmtHM(targetMs,1)})`);
  }
}
function maybeNudgeBreak(){
  if (!prefs.nudges.notifications) return;
  if (watch.status !== State.ON_BREAK) { nudgeFlags.breakWarnSent = false; return; }
  const last = watch.breaks.at(-1);
  if (!last || last.endMs) return;
  const mins = prefs.nudges.breakNudgeMin || 20;
  const durMin = Math.floor((Date.now()-last.startMs)/MS_PER_MIN);
  if (durMin >= mins && !nudgeFlags.breakWarnSent){
    nudgeFlags.breakWarnSent = true;
    notify('Break is getting long ⏳', `Break is ${durMin} min now.`);
  }
}
function notify(title, body){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') new Notification(title, { body });
}

// Soft sound cue
function beep(){
  if (!prefs.nudges.sound) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.02;
  o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
}

// ===== Buttons / actions =====
btnStart.addEventListener('click', ()=>{
  if (watch.status === State.WORKING || watch.status === State.ON_BREAK) return;
  watch.status = State.WORKING;
  watch.startTimeMs = Date.now();
  watch.endTimeMs = null;
  watch.breaks = [];
  nudgeFlags = { targetSent:false, breakWarnSent:false };
  save(); fullRender();
});

btnBreak.addEventListener('click', ()=>{
  if (watch.status !== State.WORKING) return;
  watch.status = State.ON_BREAK;
  watch.breaks.push({ startMs: Date.now(), endMs: null });
  beep();
  save(); fullRender();
});

btnBack.addEventListener('click', ()=>{
  if (watch.status !== State.ON_BREAK) return;
  const last = watch.breaks[watch.breaks.length - 1];
  if (last && last.endMs == null) last.endMs = Date.now();
  watch.status = State.WORKING;
  beep();
  save(); fullRender();
});

btnEnd.addEventListener('click', ()=>{
  if (watch.status === State.IDLE || watch.status === State.ENDED) return;
  if (watch.status === State.ON_BREAK){
    const last = watch.breaks[watch.breaks.length - 1];
    if (last && last.endMs == null) last.endMs = Date.now();
  }
  watch.endTimeMs = Date.now();
  watch.status = State.ENDED;
  // Auto-save to history
  const rec = computeWatchRecord();
  if (rec) history.push(rec);
  save(); fullRender();
});

btnReset.addEventListener('click', ()=>{
  if (!confirm('Clear current stopwatch shift?')) return;
  watch = { status: State.IDLE, startTimeMs: null, endTimeMs: null, breaks: [] };
  nudgeFlags = { targetSent:false, breakWarnSent:false };
  save(); fullRender();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if (document.body.classList.contains('locked')) return; // don’t capture when locked
  const k = e.key.toLowerCase();
  if (k === 's') btnStart.click();
  if (k === 'b') btnBreak.click();
  if (k === 'k') btnBack.click();
  if (k === 'e') btnEnd.click();
  if (k === 'r') btnReset.click();
  if (k === 'm') switchMode('manual');
  if (k === 'w') switchMode('watch');
});

// Manual save to history
manualSaveBtn.addEventListener('click', ()=>{
  // Compute manual and save if valid
  const start = parseTimeToDate(startInput.value);
  if (!start){ alert('Enter start time'); return; }
  const end = endInput.value ? parseTimeToDate(endInput.value) : null;
  const breaks = getManualBreaks().map(r=>{
    const s = parseTimeToDate(r.start), e = parseTimeToDate(r.end);
    if (!s || !e) return null; const [ss,ee]=ensureForward(s,e); return {start:ss,end:ee};
  }).filter(Boolean);

  let startMs = start.getTime();
  let endMs = end ? ensureForward(start, end)[1].getTime() : null;
  let breakMs = 0;
  if (endMs){
    for (const br of breaks){
      const ov = clampIntervalToShift(br.start, br.end, new Date(startMs), new Date(endMs));
      if (ov) breakMs += (ov[1]-ov[0]);
    }
    const netMs = Math.max(0, (endMs-startMs) - breakMs);
    const rec = {
      dateISO: new Date().toISOString().slice(0,10),
      mode: 'MANUAL',
      startMs, endMs, breakMs, netMs,
      targetH: prefs.targetHours, rate: prefs.hourlyRate
    };
    history.push(rec); save(); alert('Saved to history.'); renderReport();
  } else {
    alert('Please enter an End Time to save.');
  }
});

// ===== Reporting =====
function renderReport(){
  const range = getReportRange();
  const rows = history.filter(r => r.startMs >= range.from && r.startMs <= range.to);

  repSessions.textContent = rows.length;
  const totalNet = rows.reduce((a,r)=> a + r.netMs, 0);
  repTotalNet.textContent = fmtHM(totalNet, 1);

  const daySet = new Set(rows.map(r => new Date(r.startMs).toISOString().slice(0,10)));
  const days = Math.max(1, daySet.size);
  const avgPerDay = Math.floor(totalNet / days);
  repAvgDay.textContent = fmtHM(avgPerDay, 1);

  const earnings = prefs.hourlyRate * (totalNet / MS_PER_HR);
  repEarnings.textContent = isFinite(earnings) ? `${earnings.toFixed(2)}` : '—';

  // Table
  const use24 = prefs.use24h;
  let html = `<table><thead><tr>
    <th>Date</th><th>Mode</th><th>Start</th><th>End</th><th>Breaks</th><th>Net</th><th>Target(h)</th><th>Rate</th>
  </tr></thead><tbody>`;
  for (const r of rows){
    html += `<tr>
      <td>${new Date(r.startMs).toISOString().slice(0,10)}</td>
      <td>${r.mode}</td>
      <td>${hhmmFromMs(r.startMs, use24)}</td>
      <td>${hhmmFromMs(r.endMs,   use24)}</td>
      <td>${fmtHM(r.breakMs,1)}</td>
      <td>${fmtHM(r.netMs,1)}</td>
      <td>${r.targetH ?? ''}</td>
      <td>${r.rate ?? ''}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  historyTable.innerHTML = html;
}

function getReportRange(){
  const now = new Date();
  let from, to;
  if (reportSpan.value === 'today'){
    const d = new Date(now); d.setHours(0,0,0,0);
    from = d.getTime(); to = from + 24*MS_PER_HR - 1;
  } else if (reportSpan.value === 'week'){
    const d = new Date(now); const day = (d.getDay()+6)%7; // week starts Monday
    d.setHours(0,0,0,0); d.setDate(d.getDate()-day);
    from = d.getTime(); to = from + 7*24*MS_PER_HR - 1;
  } else if (reportSpan.value === 'month'){
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    from = d.getTime();
    const n = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    to = n.getTime();
  } else {
    from = 0; to = 8.64e15;
  }
  // overrides
  if (reportStart.value){ const s = new Date(reportStart.value); s.setHours(0,0,0,0); from = s.getTime(); }
  if (reportEnd.value){ const e = new Date(reportEnd.value); e.setHours(23,59,59,999); to = e.getTime(); }
  return { from, to };
}
[reportSpan, reportStart, reportEnd].forEach(el => el.addEventListener('change', renderReport));
btnExportCsv.addEventListener('click', ()=>{
  const {from,to} = getReportRange();
  const rows = history.filter(r => r.startMs >= from && r.startMs <= to);
  const use24 = prefs.use24h;
  const csv = [
    ['date','mode','start','end','break_ms','net_ms','net_hm','target_h','rate'],
    ...rows.map(r => [
      new Date(r.startMs).toISOString().slice(0,10),
      r.mode,
      hhmmFromMs(r.startMs, use24),
      hhmmFromMs(r.endMs,   use24),
      r.breakMs,
      r.netMs,
      fmtHM(r.netMs,1),
      r.targetH ?? '',
      r.rate ?? ''
    ])
  ].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'shift_history.csv'; a.click();
  URL.revokeObjectURL(url);
});
btnPrint.addEventListener('click', ()=> window.print());

// Compute current watch record on End
function computeWatchRecord(){
  if (!watch.startTimeMs || !watch.endTimeMs) return null;
  let breakMs = 0;
  for (const b of watch.breaks){
    const end = b.endMs ?? watch.endTimeMs;
    breakMs += overlapMs(b.startMs, end, watch.startTimeMs, watch.endTimeMs);
  }
  const netMs = Math.max(0, (watch.endTimeMs - watch.startTimeMs) - breakMs);
  return {
    dateISO: new Date(watch.startTimeMs).toISOString().slice(0,10),
    mode: 'STOPWATCH',
    startMs: watch.startTimeMs,
    endMs:   watch.endTimeMs,
    breakMs, netMs,
    targetH: prefs.targetHours,
    rate:    prefs.hourlyRate
  };
}

// ===== Title clock + live tick =====
function tick(){
  const d = new Date();
  nowClock.textContent = hhmmFromDate(d, prefs.use24h) + `:${pad2(d.getSeconds())}`;

  // Live break durations (watch)
  watch.breaks.forEach((b, i)=>{
    if (b.endMs == null){
      const node = document.querySelector(`.break-dur[data-idx="${i}"]`);
      if (node) node.textContent = fmtHM(Date.now() - b.startMs, 1);
    }
  });

  // Recalc watch KPIs when not ended
  if (tabWatch.classList.contains('active') && watch.status !== State.ENDED){
    calcWatch(); // includes nudges
  }
}

// ===== Lock screen & keypad =====
const passBuffers = { unlock: [], set: [] };
function renderDots(container, arr){
  const spans = Array.from(container.querySelectorAll('span'));
  spans.forEach((s,i)=> s.classList.toggle('filled', i < arr.length));
}

function mountNumpads(){
  $$('.numpad').forEach(np=>{
    const target = np.getAttribute('data-target'); // 'unlock' or 'set'
    np.innerHTML = '';
    ['1','2','3','4','5','6','7','8','9','←','0','OK'].forEach(label=>{
      const b = document.createElement('button');
      b.textContent = label; if (label==='OK') b.classList.add('np-wide');
      b.addEventListener('click', async ()=>{
        const buf = passBuffers[target];
        if (label === '←'){ buf.pop(); }
        else if (label === 'OK'){
          if (target==='unlock'){
            if (buf.length < 4){ unlockMsg.textContent = 'Min 4 digits'; }
            else {
              const ok = await verifyPasscode(buf.join(''));
              if (ok){ hideLock(); passBuffers.unlock=[]; unlockMsg.textContent=''; }
              else { unlockMsg.textContent = 'Wrong passcode'; }
            }
          } else {
            // set modal OK is handled by Set button
          }
        } else {
          if (buf.length<8) buf.push(label);
        }
        if (target==='unlock') renderDots(unlockDots, buf);
        if (target==='set') renderDots(setDots, buf);
      });
      np.appendChild(b);
    });
  });
}
mountNumpads();

function showLock(){
  document.body.classList.add('locked');
  lockOverlay.classList.remove('hidden');
  passBuffers.unlock = [];
  renderDots(unlockDots, passBuffers.unlock);
}
function hideLock(){
  document.body.classList.remove('locked');
  lockOverlay.classList.add('hidden');
}

enablePass.addEventListener('click', ()=>{
  setMsg.textContent=''; passBuffers.set=[]; renderDots(setDots, passBuffers.set);
  $('#setPassTitle').textContent = 'Set Passcode';
  setPassModal.classList.remove('hidden');
});
changePass.addEventListener('click', ()=>{
  if (!lock.enabled){ alert('Passcode not enabled.'); return; }
  setMsg.textContent=''; passBuffers.set=[]; renderDots(setDots, passBuffers.set);
  $('#setPassTitle').textContent = 'Change Passcode';
  setPassModal.classList.remove('hidden');
});
disablePass.addEventListener('click', ()=>{
  if (!lock.enabled){ alert('Passcode not enabled.'); return; }
  if (confirm('Disable passcode?')){
    lock = { enabled:false, salt:null, hash:null }; save(); alert('Passcode disabled.');
  }
});
setConfirm.addEventListener('click', async ()=>{
  const code = passBuffers.set.join('');
  if (code.length < 4){ setMsg.textContent = 'Enter at least 4 digits'; return; }
  await setPasscode(code);
  setPassModal.classList.add('hidden');
  alert('Passcode saved.');
});

// Close modals on backdrop click
[lockOverlay,setPassModal].forEach(ov=>{
  ov.addEventListener('click', (e)=>{ if (e.target === ov){ if(ov===setPassModal) setPassModal.classList.add('hidden'); }});
});

// ===== Init =====
load();

// Apply prefs
fmtToggle.checked = prefs.use24h;
pureBlackToggle.checked = prefs.pureBlack; document.body.classList.toggle('pure-black', prefs.pureBlack);
targetIn.value = prefs.targetHours;
granIn.value   = prefs.granularityMin;
rateIn.value   = prefs.hourlyRate;
notifToggle.checked = prefs.nudges.notifications;
soundToggle.checked = prefs.nudges.sound;
titleTickerToggle.checked = prefs.nudges.titleTicker;
breakNudgeMin.value = prefs.nudges.breakNudgeMin;
targetNudge.value = prefs.nudges.targetNudge;

// Lock on load if enabled
if (lock.enabled){ showLock(); }

// Default tab
switchMode('watch');

// Intervals
setInterval(tick, 1000);
setInterval(save, 5000);

// ===== Full render =====
function fullRender(){
  renderWatchHeader();
  renderWatchFormTimes();
  renderWatchBreaks();
  updateWatchButtons();

  if (tabWatch.classList.contains('active')) calcWatch(false);
  if (tabManual.classList.contains('active')) { renderManualFromState(); calcManual(); }
}

// Manual inputs -> state
startInput.addEventListener('input', ()=>{ manual.start = startInput.value; save(); triggerCalc(); });
endInput.addEventListener('input',   ()=>{ manual.end   = endInput.value;   save(); triggerCalc(); });
addBreakBtn.addEventListener('click', ()=>{ addBreakRow(); manual.breaks = getManualBreaks(); save(); triggerCalc(); });
clearBreaksBtn.addEventListener('click', ()=>{
  breaksContainer.innerHTML = ''; addBreakRow(); manual.breaks = getManualBreaks(); save(); triggerCalc();
});

// Debounced calc
let t;
function triggerCalc(){ clearTimeout(t); t = setTimeout(()=>{ statusTag.textContent='Calculating…'; tabWatch.classList.contains('active') ? calcWatch(false) : calcManual(); }, 120); }
