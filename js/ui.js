// ui.js — tabs, settings, global toggles, title/clock, keyboard
import { $, emit, on, hhmmFromDate, pad2 } from './core.js';
import { state, saveAll } from './storage.js';

const tabWatch = $('#tabWatch'), tabManual = $('#tabManual'), tabReport = $('#tabReport'), tabSync = $('#tabSync');
const modeWatch = $('#modeWatch'), modeManual = $('#modeManual'), modeReport = $('#modeReport'), modeSync = $('#modeSync');

const fmtToggle = $('#fmtToggle');
const pureBlackToggle = $('#pureBlackToggle');
const settingsBtn = $('#settingsBtn');
const settingsPanel = $('#settingsPanel');
$('#closeSettings').addEventListener('click', ()=> settingsPanel.classList.add('hidden'));

const targetIn = $('#targetHours');
const granIn   = $('#granularity');
const rateIn   = $('#hourlyRate');

const notifToggle = $('#notifToggle');
const soundToggle = $('#soundToggle');
const titleTickerToggle = $('#titleTickerToggle');
const breakNudgeMin = $('#breakNudgeMin');
const targetNudge = $('#targetNudge');

const nowClock = $('#nowClock');

export function switchMode(which){
  [tabWatch, tabManual, tabReport, tabSync].forEach(t => t.classList.remove('active'));
  [modeWatch, modeManual, modeReport, modeSync].forEach(m => m.classList.add('hidden'));
  if (which === 'watch'){ tabWatch.classList.add('active'); modeWatch.classList.remove('hidden'); }
  if (which === 'manual'){ tabManual.classList.add('active'); modeManual.classList.remove('hidden'); }
  if (which === 'report'){ tabReport.classList.add('active'); modeReport.classList.remove('hidden'); emit('report:render'); }
  if (which === 'sync'){   tabSync.classList.add('active');   modeSync.classList.remove('hidden'); }
  emit('ui:mode', which);
}

export function activeMode(){
  if (tabWatch.classList.contains('active')) return 'watch';
  if (tabManual.classList.contains('active')) return 'manual';
  if (tabReport.classList.contains('active')) return 'report';
  return 'sync';
}

export function initUI(){
  // tab buttons
  tabWatch.addEventListener('click', ()=> switchMode('watch'));
  tabManual.addEventListener('click', ()=> switchMode('manual'));
  tabReport.addEventListener('click', ()=> switchMode('report'));
  tabSync.addEventListener('click',   ()=> switchMode('sync'));

  // toggles
  fmtToggle.checked = state.prefs.use24h;
  pureBlackToggle.checked = state.prefs.pureBlack; document.body.classList.toggle('pure-black', state.prefs.pureBlack);
  notifToggle.checked = state.prefs.nudges.notifications;
  soundToggle.checked = state.prefs.nudges.sound;
  titleTickerToggle.checked = state.prefs.nudges.titleTicker;
  breakNudgeMin.value = state.prefs.nudges.breakNudgeMin;
  targetNudge.value = state.prefs.nudges.targetNudge;

  targetIn.value = state.prefs.targetHours;
  granIn.value   = state.prefs.granularityMin;
  rateIn.value   = state.prefs.hourlyRate;

  fmtToggle.addEventListener('change', ()=>{ state.prefs.use24h = fmtToggle.checked; saveAll(); emit('prefs:changed'); });
  pureBlackToggle.addEventListener('change', ()=>{
    state.prefs.pureBlack = pureBlackToggle.checked; document.body.classList.toggle('pure-black', state.prefs.pureBlack); saveAll();
  });
  settingsBtn.addEventListener('click', ()=> settingsPanel.classList.toggle('hidden'));

  notifToggle.addEventListener('change', async ()=>{
    state.prefs.nudges.notifications = notifToggle.checked; saveAll();
    if (state.prefs.nudges.notifications && 'Notification' in window && Notification.permission !== 'granted'){
      try{ await Notification.requestPermission(); }catch{}
    }
  });
  soundToggle.addEventListener('change', ()=>{ state.prefs.nudges.sound = soundToggle.checked; saveAll(); });
  titleTickerToggle.addEventListener('change', ()=>{ state.prefs.nudges.titleTicker = titleTickerToggle.checked; saveAll(); });
  breakNudgeMin.addEventListener('input', ()=>{ state.prefs.nudges.breakNudgeMin = Math.max(5, Number(breakNudgeMin.value)||20); saveAll(); });
  targetNudge.addEventListener('change', ()=>{ state.prefs.nudges.targetNudge = targetNudge.value; saveAll(); });

  // shared numeric inputs
  const savePrefs = ()=>{
    state.prefs.targetHours = Math.max(0, Number(targetIn.value)||0);
    state.prefs.granularityMin = Math.max(1, Number(granIn.value)||1);
    state.prefs.hourlyRate = Math.max(0, Number(rateIn.value)||0);
    saveAll(); emit('prefs:changed');
  };
  $('#calcBtn').addEventListener('click', savePrefs);
  targetIn.addEventListener('input', savePrefs);
  granIn.addEventListener('input', savePrefs);
  rateIn.addEventListener('input', savePrefs);

  // keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if (document.body.classList.contains('locked')) return;
    const k = e.key.toLowerCase();
    if (k==='m') switchMode('manual');
    if (k==='w') switchMode('watch');
    if (k==='r' && activeMode()==='watch') emit('watch:reset');
    if (k==='s' && activeMode()==='watch') emit('watch:start');
    if (k==='b' && activeMode()==='watch') emit('watch:break');
    if (k==='k' && activeMode()==='watch') emit('watch:back');
    if (k==='e' && activeMode()==='watch') emit('watch:end');
  });

  // live device clock
  setInterval(()=>{
    const d = new Date();
    nowClock.textContent = hhmmFromDate(d, state.prefs.use24h) + `:${pad2(d.getSeconds())}`;
    // let stopwatch module refresh if needed
    emit('tick');
  }, 1000);
}
