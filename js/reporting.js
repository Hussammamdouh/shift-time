// reporting.js — totals, table, export, print, edit hooks
import { $, fmtHM, hhmmFromMs } from './core.js';
import { state, earningsFromMs } from './storage.js';

const reportSpan = $('#reportSpan'), reportStart = $('#reportStart'), reportEnd = $('#reportEnd');
const repSessions = $('#repSessions'), repTotalNet = $('#repTotalNet'), repAvgDay = $('#repAvgDay'), repEarnings = $('#repEarnings');
const historyTable = $('#historyTable');
const btnExportCsv = $('#btnExportCsv'), btnPrint = $('#btnPrint');

function getReportRange(){
  const now = new Date();
  let from, to;
  if (reportSpan.value === 'today'){
    const d = new Date(now); d.setHours(0,0,0,0);
    from = d.getTime(); to = from + 24*60*60*1000 - 1;
  } else if (reportSpan.value === 'week'){
    const d = new Date(now); const day = (d.getDay()+6)%7; // Monday start
    d.setHours(0,0,0,0); d.setDate(d.getDate()-day);
    from = d.getTime(); to = from + 7*24*60*60*1000 - 1;
  } else if (reportSpan.value === 'month'){
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    from = d.getTime();
    const n = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    to = n.getTime();
  } else {
    from = 0; to = 8.64e15;
  }
  if (reportStart.value){ const s = new Date(reportStart.value); s.setHours(0,0,0,0); from = s.getTime(); }
  if (reportEnd.value){ const e = new Date(reportEnd.value); e.setHours(23,59,59,999); to = e.getTime(); }
  return { from, to };
}

export function renderReport(){
  const range = getReportRange();
  const rows = state.history.filter(r => r.startMs >= range.from && r.startMs <= range.to);

  repSessions.textContent = rows.length;
  const totalNet = rows.reduce((a,r)=> a + r.netMs, 0);
  repTotalNet.textContent = fmtHM(totalNet, 1);

  const daySet = new Set(rows.map(r => new Date(r.startMs).toISOString().slice(0,10)));
  const days = Math.max(1, daySet.size);
  const avgPerDay = Math.floor(totalNet / days);
  repAvgDay.textContent = fmtHM(avgPerDay, 1);

  const earnings = earningsFromMs(totalNet);
  repEarnings.textContent = isFinite(earnings) ? `${earnings.toFixed(2)}` : '—';

  // Table
  const use24 = state.prefs.use24h;
  let html = `<table><thead><tr>
    <th>Date</th><th>Mode</th><th>Start</th><th>End</th><th>Breaks</th><th>Net</th><th>Target(h)</th><th>Rate</th><th>Edit</th>
  </tr></thead><tbody>`;
  rows.forEach((r, idx)=>{
    const indexInGlobal = state.history.indexOf(r);
    html += `<tr>
      <td>${new Date(r.startMs).toISOString().slice(0,10)}</td>
      <td>${r.mode}</td>
      <td>${hhmmFromMs(r.startMs, use24)}</td>
      <td>${hhmmFromMs(r.endMs,   use24)}</td>
      <td>${fmtHM(r.breakMs,1)}</td>
      <td>${fmtHM(r.netMs,1)}</td>
      <td>${r.targetH ?? ''}</td>
      <td>${r.rate ?? ''}</td>
      <td><button class="btn-ghost btn" data-edit="${indexInGlobal}">Edit…</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  historyTable.innerHTML = html;

  historyTable.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const idx = Number(btn.getAttribute('data-edit'));
      const ev = new CustomEvent('history:edit', { detail: idx });
      window.dispatchEvent(ev);
    });
  });
}

export function initReporting(){
  [reportSpan, reportStart, reportEnd].forEach(el => el.addEventListener('change', renderReport));
  btnExportCsv.addEventListener('click', ()=>{
    const {from,to} = getReportRange();
    const rows = state.history.filter(r => r.startMs >= from && r.startMs <= to);
    const use24 = state.prefs.use24h;
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
}
