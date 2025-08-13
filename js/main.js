// main.js — bootstrap the whole app
import { on, emit } from './core.js';
import { loadAll, saveAll, state } from './storage.js';
import { initPasscodeUI } from './passcode.js';
import { initUI, switchMode } from './ui.js';
import { fullRender as renderWatch } from './stopwatch.js';
import { initManual, fullRenderManual } from './manual.js';
import { initReporting, renderReport } from './reporting.js';
import { initEditing } from './editing.js';
import { initSync } from './sync.js';

loadAll();

// Init UI + features
initPasscodeUI();
initUI();
initManual();
initReporting();
initEditing();
initSync();

// Default tab
switchMode('watch');

// Re-render hooks
on('prefs:changed', ()=>{ renderWatch(); fullRenderManual(); renderReport(); });
on('report:render', ()=> renderReport());
window.addEventListener('sync:applied', ()=> { renderWatch(); fullRenderManual(); renderReport(); });

// First full paint
renderWatch();
fullRenderManual();
renderReport();

// Periodic autosave
setInterval(saveAll, 5000);
