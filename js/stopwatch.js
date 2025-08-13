// stopwatch.js — live engine, KPIs, buttons
import { $, fmtHM, hhmmFromMs, overlapMs, MS_PER_MIN, State, beep, notify, emit, on } from './core.js';
import { state, saveAll, computeWatchRecord, pushHistory } from './storage.js';

const stateBadge = $('#stateBadge');
const watchStartInput = $('#watchStart'), watchEndInput = $('#watchEnd'), watchBreaksList = $('#watchBreaksList');
const kpi = {
  raw: $('#kpiRaw'), brk: $('#kpiBreaks'), net: $('#kpiNet'),
  tgt: $('#kpiTarget'), rem: $('#kpiRemain'), over: $('#kpiOver'),
  suggest: $('#kpiSuggest'), state: $('#kpiState'),
};
const resultsBox = $('#results');
const breakListRender = $('#breakListRender');
const endNote = $('#endNote');
const tickerPill = $('#tickerPill');

function toInputTime(ms){ const d = new Date(ms); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

function renderHeader(){ stateBadge.textContent = state.watch.status; }
function renderFormTimes(){
  watchStartInput.value = state.watch.startTimeMs ? toInputTime(state.watch.startTimeMs) : '';
  watchEndInput.value   = state.watch.endTimeMs   ? toInputTime(state.watch.endTimeMs)   : '';
}
function renderBreaks(){
  watchBreaksList.innerHTML = '';
  if (!state.watch.breaks.length){
    const empty = document.createElement('div'); empty.className='pill'; empty.textContent='No breaks yet';
    watchBreaksList.appendChild(empty); return;
  }
  state.watch.breaks.forEach((b,i)=>{
    const dur = (b.endMs ?? Date.now()) - b.startMs;
    const div = document.createElement('div');
    div.className = 'break-card';
    div.innerHTML = `
      <div class="break-head">
        <span>Break ${i+1}</span>
        <span class="break-dur" data-idx="${i}">${fmtHM(dur,1)}</span>
      </div>
      <div class="foot-note">From <b>${hhmmFromMs(b.startMs, state.prefs.use24h)}</b> to <b>${b.endMs ? hhmmFromMs(b.endMs, state.prefs.use24h) : '— (active)'}</b></div>
    `;
    watchBreaksList.appendChild(div);
  });
}
function updateButtons(){
  const d = (id,flag)=> $('#'+id).classList.toggle('btn-disabled', !!flag);
  if (state.watch.status === State.IDLE){
    d('btnStart',false); d('btnBreak',true); d('btnBack',true); d('btnEnd',true);
  } else if (state.watch.status === State.WORKING){
    d('btnStart',true); d('btnBreak',false); d('btnBack',true); d('btnEnd',false);
  } else if (state.watch.status === State.ON_BREAK){
    d('btnStart',true); d('btnBreak',true); d('btnBack',false); d('btnEnd',false);
  } else if (state.watch.status === State.ENDED){
    d('btnStart',false); d('btnBreak',true); d('btnBack',true); d('btnEnd',true);
  }
}

export function calcWatch(sendNudges=true){
  const gran = Math.max(1, state.prefs.granularityMin);
  const targetMs = (Number(state.prefs.targetHours)||0) * 60 * 60 * 1000;

  if (!state.watch.startTimeMs){ resultsBox.style.display='none'; return; }

  const shiftStart = state.watch.startTimeMs;
  const shiftEnd = (state.watch.status === State.ENDED && state.watch.endTimeMs) ? state.watch.endTimeMs : Date.now();
  const rawShiftMs = Math.max(0, shiftEnd - shiftStart);

  let breakMs = 0;
  for (const b of state.watch.breaks){
    const bEnd = (b.endMs ?? Date.now());
    breakMs += overlapMs(b.startMs, bEnd, shiftStart, shiftEnd);
  }
  const netMs = Math.max(0, rawShiftMs - breakMs);

  const diff = netMs - targetMs;
  const remainingText = diff < 0 ? fmtHM(-diff, gran) : '—';
  const overtimeText  = diff > 0 ? fmtHM(diff,  gran) : '—';

  let suggestedEndText = '—';
  if (state.watch.status !== State.ENDED && targetMs > 0){
    const need = Math.max(0, targetMs - netMs);
    suggestedEndText = hhmmFromMs(Date.now() + need, state.prefs.use24h);
  }

  resultsBox.style.display = 'grid';
  kpi.raw.textContent  = fmtHM(rawShiftMs, gran);
  kpi.brk.textContent  = fmtHM(breakMs, gran);
  kpi.net.textContent  = fmtHM(netMs, gran);
  kpi.tgt.textContent  = fmtHM(targetMs, gran);
  kpi.rem.textContent  = remainingText;
  kpi.over.textContent = overtimeText;
  kpi.suggest.textContent = suggestedEndText;
  kpi.state.textContent   = `STOPWATCH • ${state.watch.status}`;

  if(!state.watch.breaks.length){
    breakListRender.innerHTML = `<div class="tag">No breaks yet</div>`;
  } else {
    breakListRender.innerHTML = state.watch.breaks.map((b,i)=>`
      <div class="break-card">
        <div class="break-head">
          <span>Break ${i+1}</span>
          <span class="break-dur">${fmtHM((b.endMs ?? Date.now())-b.startMs,1)}</span>
        </div>
        <div class="foot-note">From <b>${hhmmFromMs(b.startMs, state.prefs.use24h)}</b> to <b>${b.endMs ? hhmmFromMs(b.endMs, state.prefs.use24h) : '— (active)'}</b></div>
      </div>
    `).join('');
  }
  endNote.innerHTML = (state.watch.status !== State.ENDED && suggestedEndText !== '—')
    ? `Suggested End Time to meet target: <b>${suggestedEndText}</b>.`
    : '';

  // title ticker
  if (state.prefs.nudges.titleTicker){
    document.title = `${fmtHM(netMs, 1)} • ${state.watch.status} — Shift Time`;
    tickerPill.textContent = `Net ${fmtHM(netMs,1)}`;
  }

  // Nudges
  if (sendNudges){
    maybeNudgeTarget(netMs, targetMs);
    maybeNudgeBreak();
  }
}

let nudgeFlags = { targetSent:false, breakWarnSent:false };
function maybeNudgeTarget(netMs, targetMs){
  if (state.prefs.nudges.targetNudge !== 'on' || !state.prefs.nudges.notifications) return;
  if (targetMs <= 0) return;
  if (!nudgeFlags.targetSent && netMs >= targetMs){
    nudgeFlags.targetSent = true;
    notify('Target reached 🎉', `You’ve worked ${fmtHM(netMs,1)} (>= ${fmtHM(targetMs,1)})`);
  }
}
function maybeNudgeBreak(){
  if (!state.prefs.nudges.notifications) return;
  if (state.watch.status !== State.ON_BREAK) { nudgeFlags.breakWarnSent = false; return; }
  const last = state.watch.breaks.at(-1);
  if (!last || last.endMs) return;
  const mins = state.prefs.nudges.breakNudgeMin || 20;
  const durMin = Math.floor((Date.now()-last.startMs)/MS_PER_MIN);
  if (durMin >= mins && !nudgeFlags.breakWarnSent){
    nudgeFlags.breakWarnSent = true;
    notify('Break is getting long ⏳', `Break is ${durMin} min now.`);
  }
}

// Buttons via event bus (bound in ui)
on('watch:start', ()=>{
  if (state.watch.status === State.WORKING || state.watch.status === State.ON_BREAK) return;
  state.watch.status = State.WORKING;
  state.watch.startTimeMs = Date.now();
  state.watch.endTimeMs = null;
  state.watch.breaks = [];
  nudgeFlags = { targetSent:false, breakWarnSent:false };
  saveAll(); fullRender();
});
on('watch:break', ()=>{
  if (state.watch.status !== State.WORKING) return;
  state.watch.status = State.ON_BREAK;
  state.watch.breaks.push({ startMs: Date.now(), endMs: null });
  saveAll(); beep(state.prefs.nudges.sound); fullRender();
});
on('watch:back', ()=>{
  if (state.watch.status !== State.ON_BREAK) return;
  const last = state.watch.breaks[state.watch.breaks.length - 1];
  if (last && last.endMs == null) last.endMs = Date.now();
  state.watch.status = State.WORKING;
  saveAll(); beep(state.prefs.nudges.sound); fullRender();
});
on('watch:end', ()=>{
  if (state.watch.status === State.IDLE || state.watch.status === State.ENDED) return;
  if (state.watch.status === State.ON_BREAK){
    const last = state.watch.breaks[state.watch.breaks.length - 1];
    if (last && last.endMs == null) last.endMs = Date.now();
  }
  state.watch.endTimeMs = Date.now();
  state.watch.status = State.ENDED;
  const rec = computeWatchRecord();
  if (rec) pushHistory(rec);
  saveAll(); fullRender();
});
on('watch:reset', ()=>{
  if (!confirm('Clear current stopwatch shift?')) return;
  state.watch = { status: State.IDLE, startTimeMs:null, endTimeMs:null, breaks:[] };
  nudgeFlags = { targetSent:false, breakWarnSent:false };
  saveAll(); fullRender();
});

// tick updates (live durations)
on('tick', ()=>{
  // live break durations
  state.watch.breaks.forEach((b,i)=>{
    if (b.endMs == null){
      const node = document.querySelector(`.break-dur[data-idx="${i}"]`);
      if (node) node.textContent = fmtHM(Date.now() - b.startMs, 1);
    }
  });
  if (state.watch.status !== State.ENDED && state.watch.startTimeMs) calcWatch();
});

// external renders
export function fullRender(){
  renderHeader();
  renderFormTimes();
  renderBreaks();
  updateButtons();
  calcWatch(false);
}
