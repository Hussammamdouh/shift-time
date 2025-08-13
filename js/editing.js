// editing.js — edit current stopwatch + edit history record
import { $, $$, toDTLocal, fromDTLocal } from './core.js';
import { state, saveAll, computeWatchRecord, pushHistory } from './storage.js';
import { renderReport } from './reporting.js';
import { fullRender as renderWatch } from './stopwatch.js';

// Elements — current
const ecModal = $('#editCurrentModal');
const ecStartDT = $('#ecStartDT');
const ecEndDT = $('#ecEndDT');
const ecBreaksWrap = $('#ecBreaks');
const ecAddBreak = $('#ecAddBreak');
const ecSave = $('#ecSave');
const ecCancel = $('#ecCancel');
const ecMsg = $('#ecMsg');

// Elements — history
const ehModal = $('#editHistoryModal');
const ehStartDT = $('#ehStartDT');
const ehEndDT = $('#ehEndDT');
const ehBreaksWrap = $('#ehBreaks');
const ehAddBreak = $('#ehAddBreak');
const ehSave = $('#ehSave');
const ehCancel = $('#ehCancel');
const ehMsg = $('#ehMsg');

let editingHistoryIndex = null;

function normalizeBreaks(breaks){
  const arr = breaks
    .filter(b => b.startMs && (b.endMs ?? (b.startMs+1)) && (b.endMs ? b.endMs > b.startMs : true))
    .map(b => ({ startMs: b.startMs, endMs: b.endMs ?? null }))
    .sort((a,b)=> a.startMs - b.startMs);

  const merged = [];
  for (const b of arr){
    if (!merged.length){ merged.push({...b}); continue; }
    const last = merged[merged.length-1];
    const bEnd = b.endMs ?? Infinity;
    const lEnd = last.endMs ?? Infinity;
    if (b.startMs <= lEnd){
      const newEnd = Math.max(lEnd, bEnd);
      last.endMs = (newEnd === Infinity ? null : newEnd);
    } else {
      merged.push({...b});
    }
  }
  return merged;
}

function clampBreaksTo(startMs, endMs, list){
  const out=[]; for (const b of list){
    const s = Math.max(b.startMs, startMs);
    const e = Math.min(b.endMs ?? endMs, endMs);
    if (e > s) out.push({ startMs:s, endMs:e });
  } return out;
}

function ecAddBreakRow(start='', end=''){
  const id = Math.random().toString(36).slice(2,7);
  const row = document.createElement('div');
  row.className = 'break-card';
  row.innerHTML = `
    <div class="break-head">
      <strong>Break</strong>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-dup="${id}">⎘</button>
        <button class="btn btn-danger" type="button" data-del="${id}">✕</button>
      </div>
    </div>
    <div class="grid g2" style="align-items:end">
      <div>
        <label>Start</label>
        <input type="datetime-local" class="ec-bstart" value="${start}">
      </div>
      <div>
        <label>End</label>
        <input type="datetime-local" class="ec-bend" value="${end}">
      </div>
    </div>
  `;
  ecBreaksWrap.appendChild(row);
  row.querySelector(`[data-del="${id}"]`).addEventListener('click', ()=> row.remove());
  row.querySelector(`[data-dup="${id}"]`).addEventListener('click', ()=>{
    const s = row.querySelector('.ec-bstart').value;
    const e = row.querySelector('.ec-bend').value;
    ecAddBreakRow(s,e);
  });
}

function ehAddBreakRow(start='', end=''){
  const id = Math.random().toString(36).slice(2,7);
  const row = document.createElement('div');
  row.className = 'break-card';
  row.innerHTML = `
    <div class="break-head">
      <strong>Break</strong>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-dup="${id}">⎘</button>
        <button class="btn btn-danger" type="button" data-del="${id}">✕</button>
      </div>
    </div>
    <div class="grid g2" style="align-items:end">
      <div>
        <label>Start</label>
        <input type="datetime-local" class="eh-bstart" value="${start}">
      </div>
      <div>
        <label>End</label>
        <input type="datetime-local" class="eh-bend" value="${end}">
      </div>
    </div>
  `;
  ehBreaksWrap.appendChild(row);
  row.querySelector(`[data-del="${id}"]`).addEventListener('click', ()=> row.remove());
  row.querySelector(`[data-dup="${id}"]`).addEventListener('click', ()=>{
    const s = row.querySelector('.eh-bstart').value;
    const e = row.querySelector('.eh-bend').value;
    ehAddBreakRow(s,e);
  });
}

export function initEditing(){
  // Buttons that open current edit modal
  $('#btnStartAt').addEventListener('click', ()=>{
    const base = state.watch.startTimeMs ?? Date.now();
    ecStartDT.value = toDTLocal(base);
    ecEndDT.value = state.watch.endTimeMs ? toDTLocal(state.watch.endTimeMs) : '';
    ecBreaksWrap.innerHTML = '';
    (state.watch.breaks.length ? state.watch.breaks : [{startMs:'', endMs:''}]).forEach(b => ecAddBreakRow(b.startMs?toDTLocal(b.startMs):'', b.endMs?toDTLocal(b.endMs):''));
    ecMsg.textContent = 'Set a past start (and optionally end).';
    ecModal.classList.remove('hidden');
  });

  $('#btnEndAt').addEventListener('click', ()=>{
    if (!state.watch.startTimeMs){ alert('You need a Start first.'); return; }
    ecStartDT.value = toDTLocal(state.watch.startTimeMs);
    ecEndDT.value = toDTLocal(Date.now());
    ecBreaksWrap.innerHTML = '';
    (state.watch.breaks.length ? state.watch.breaks : [{startMs:'', endMs:''}]).forEach(b => ecAddBreakRow(b.startMs?toDTLocal(b.startMs):'', b.endMs?toDTLocal(b.endMs):''));
    ecMsg.textContent = 'Adjust End to when you actually finished.';
    ecModal.classList.remove('hidden');
  });

  $('#btnEditCurrent').addEventListener('click', ()=>{
    if (!state.watch.startTimeMs){ alert('No active/ended shift to edit.'); return; }
    ecStartDT.value = toDTLocal(state.watch.startTimeMs);
    ecEndDT.value = state.watch.endTimeMs ? toDTLocal(state.watch.endTimeMs) : '';
    ecBreaksWrap.innerHTML = '';
    (state.watch.breaks.length ? state.watch.breaks : [{startMs:'', endMs:''}]).forEach(b => ecAddBreakRow(b.startMs?toDTLocal(b.startMs):'', b.endMs?toDTLocal(b.endMs):''));
    ecMsg.textContent = 'Add/remove breaks, or tweak Start/End.';
    ecModal.classList.remove('hidden');
  });

  ecAddBreak.addEventListener('click', ()=> ecAddBreakRow());
  ecCancel.addEventListener('click', ()=> ecModal.classList.add('hidden'));
  ecModal.addEventListener('click', (e)=>{ if (e.target === ecModal) ecModal.classList.add('hidden'); });

  ecSave.addEventListener('click', ()=>{
    const startMs = fromDTLocal(ecStartDT.value);
    const endMs = fromDTLocal(ecEndDT.value);
    if (!startMs){ ecMsg.textContent = 'Start is required.'; return; }
    if (endMs && endMs <= startMs){ ecMsg.textContent = 'End must be after Start.'; return; }

    const breaks = Array.from(ecBreaksWrap.querySelectorAll('.break-card')).map(card=>{
      const s = fromDTLocal(card.querySelector('.ec-bstart').value);
      const e = fromDTLocal(card.querySelector('.ec-bend').value);
      if (!s || !e) return null;
      if (e <= s) return null;
      return { startMs: s, endMs: e };
    }).filter(Boolean);

    const normalized = normalizeBreaks(breaks);

    state.watch.startTimeMs = startMs;
    state.watch.endTimeMs = endMs || null;
    state.watch.status = endMs ? 'ENDED' : (state.watch.status === 'ON_BREAK' ? 'ON_BREAK' : 'WORKING');
    state.watch.breaks = endMs ? clampBreaksTo(startMs, endMs, normalized) : normalized;

    if (state.watch.status === 'ENDED'){
      const rec = computeWatchRecord();
      if (rec) pushHistory(rec);
    }

    saveAll();
    ecModal.classList.add('hidden');
    renderWatch();
  });

  // History edit
  window.addEventListener('history:edit', (ev)=>{
    const idx = ev.detail; editingHistoryIndex = idx;
    const rec = state.history[idx]; if (!rec){ alert('Record not found'); return; }
    ehStartDT.value = toDTLocal(rec.startMs);
    ehEndDT.value   = toDTLocal(rec.endMs);
    ehBreaksWrap.innerHTML = '';
    const br = rec.breaks || [];
    if (br.length){ br.forEach(b => ehAddBreakRow(toDTLocal(b.startMs), toDTLocal(b.endMs))); }
    else ehAddBreakRow('','');
    ehMsg.textContent = 'Adjust times; breaks are optional.';
    ehModal.classList.remove('hidden');
  });

  ehAddBreak.addEventListener('click', ()=> ehAddBreakRow());
  ehCancel.addEventListener('click', ()=> ehModal.classList.add('hidden'));
  ehModal.addEventListener('click', (e)=>{ if (e.target === ehModal) ehModal.classList.add('hidden'); });

  ehSave.addEventListener('click', ()=>{
    const rec = state.history[editingHistoryIndex];
    if (!rec){ ehMsg.textContent = 'Record missing.'; return; }

    const startMs = fromDTLocal(ehStartDT.value);
    const endMs = fromDTLocal(ehEndDT.value);
    if (!startMs || !endMs){ ehMsg.textContent = 'Start and End are required.'; return; }
    if (endMs <= startMs){ ehMsg.textContent = 'End must be after Start.'; return; }

    const breaks = Array.from(ehBreaksWrap.querySelectorAll('.break-card')).map(card=>{
      const s = fromDTLocal(card.querySelector('.eh-bstart').value);
      const e = fromDTLocal(card.querySelector('.eh-bend').value);
      if (!s || !e) return null;
      if (e <= s) return null;
      return { startMs:s, endMs:e };
    }).filter(Boolean);

    const normalized = normalizeBreaks(breaks);
    const trimmed = clampBreaksTo(startMs, endMs, normalized);
    const breakMs = trimmed.reduce((a,b)=> a + (b.endMs - b.startMs), 0);
    const netMs = Math.max(0, (endMs - startMs) - breakMs);

    state.history[editingHistoryIndex] = { ...rec, startMs, endMs, breaks: trimmed, breakMs, netMs };
    saveAll(); ehModal.classList.add('hidden'); renderReport();
  });
}
