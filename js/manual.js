// manual.js — manual entry, break rows, KPIs, save to history
import { $, $$, fmtHM, parseTimeToDate, ensureForward, clampIntervalToShift, hhmmFromMs } from './core.js';
import { state, saveAll, pushHistory } from './storage.js';

const startInput = $('#startTime'), endInput = $('#endTime'), breaksContainer = $('#breaks');
const kpi = {
  raw: $('#kpiRaw'), brk: $('#kpiBreaks'), net: $('#kpiNet'),
  tgt: $('#kpiTarget'), rem: $('#kpiRemain'), over: $('#kpiOver'),
  suggest: $('#kpiSuggest'), state: $('#kpiState'),
};
const resultsBox = $('#results'), breakListRender = $('#breakListRender'), endNote = $('#endNote');
const statusTag = $('#statusTag');

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
    state.manual.breaks = getManualBreaks();
    saveAll();
  };

  startIn.addEventListener('input', ()=>{ updateDur(); triggerCalc(); persist(); });
  endIn.addEventListener('input',   ()=>{ updateDur(); triggerCalc(); persist(); });

  el.querySelector(`[data-del="${id}"]`).addEventListener('click', ()=>{
    el.remove(); state.manual.breaks = getManualBreaks(); saveAll(); triggerCalc();
  });
  el.querySelector(`[data-dup="${id}"]`).addEventListener('click', ()=>{
    addBreakRow({ start:startIn.value, end:endIn.value }); state.manual.breaks = getManualBreaks(); saveAll(); triggerCalc();
  });

  updateDur();
}

function renderManualFromState(){
  startInput.value = state.manual.start || '';
  endInput.value   = state.manual.end   || '';
  breaksContainer.innerHTML = '';
  if (state.manual.breaks && state.manual.breaks.length) state.manual.breaks.forEach(b => addBreakRow(b));
  else addBreakRow();
}

function getManualBreaks(){
  return $$('.break-card', breaksContainer).map(card=>{
    const bs = card.querySelector('.break-start').value;
    const be = card.querySelector('.break-end').value;
    return { start: bs || '', end: be || '' };
  });
}

export function calcManual(){
  const startVal = startInput.value;
  const endVal   = endInput.value;
  const targetH  = Math.max(0, state.prefs.targetHours);
  const granMin  = Math.max(1, state.prefs.granularityMin);

  statusTag.textContent = 'Calculating…';

  const start = parseTimeToDate(startVal);
  if(!start){ resultsBox.style.display='none'; statusTag.textContent = 'Enter a start time'; return; }

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

  const targetMs = targetH * 60 * 60 * 1000;
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
      suggestedEnd = hhmmFromMs(candidate.getTime(), state.prefs.use24h);
    }
  } else {
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
    suggestedEnd = hhmmFromMs(requiredEnd.getTime(), state.prefs.use24h);

    rawShiftMs = null; breakMs = totalBreakMs; netMs = null;
  }

  // Render
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

  if(!breaks.length){
    breakListRender.innerHTML = `<div class="tag">No breaks added</div>`;
  } else {
    breakListRender.innerHTML = breaks.map((b,i)=>`
      <div class="break-card">
        <div class="break-head">
          <span>Break ${i+1}</span>
          <span class="break-dur">${fmtHM(b.end-b.start,1)}</span>
        </div>
        <div class="foot-note">From <b>${hhmmFromMs(b.start.getTime(), state.prefs.use24h)}</b> to <b>${hhmmFromMs(b.end.getTime(), state.prefs.use24h)}</b></div>
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

export function initManual(){
  renderManualFromState();
  startInput.addEventListener('input', ()=>{ state.manual.start = startInput.value; saveAll(); triggerCalc(); });
  endInput.addEventListener('input',   ()=>{ state.manual.end   = endInput.value;   saveAll(); triggerCalc(); });
  $('#addBreakBtn').addEventListener('click', ()=>{ addBreakRow(); state.manual.breaks = getManualBreaks(); saveAll(); triggerCalc(); });
  $('#clearBreaksBtn').addEventListener('click', ()=>{
    breaksContainer.innerHTML = ''; addBreakRow(); state.manual.breaks = getManualBreaks(); saveAll(); triggerCalc();
  });
  $('#manualSave').addEventListener('click', ()=>{
    const start = parseTimeToDate(startInput.value);
    const end = endInput.value ? parseTimeToDate(endInput.value) : null;
    if (!start || !end){ alert('Please enter Start and End time.'); return; }
    const [ss,ee] = ensureForward(start, end);
    const breaks = getManualBreaks().map(r=>{
      const s = parseTimeToDate(r.start), e = parseTimeToDate(r.end);
      if (!s || !e) return null; const [s2,e2] = ensureForward(s,e); return { start:s2, end:e2 };
    }).filter(Boolean);
    // compute totals
    let breakMs = 0;
    for (const br of breaks){
      const ov = clampIntervalToShift(br.start, br.end, ss, ee);
      if (ov) breakMs += (ov[1]-ov[0]);
    }
    const netMs = Math.max(0, (ee-ss) - breakMs);
    const rec = {
      dateISO: new Date().toISOString().slice(0,10),
      mode: 'MANUAL',
      startMs: ss.getTime(),
      endMs: ee.getTime(),
      breaks: breaks.map(b=>({startMs:b.start.getTime(), endMs:b.end.getTime()})),
      breakMs, netMs,
      targetH: state.prefs.targetHours, rate: state.prefs.hourlyRate
    };
    pushHistory(rec); alert('Saved to history.');
  });
}

let t;
function triggerCalc(){ clearTimeout(t); t = setTimeout(()=> calcManual(), 120); }

export function fullRenderManual(){ renderManualFromState(); calcManual(); }
