// passcode.js — numeric passcode (4–8), hashing, overlays
import { $, $$, emit, sha256Hex } from './core.js';
import { state, defaults, saveAll } from './storage.js';

// Elements
const lockOverlay = $('#lockOverlay');
const unlockDots  = $('#unlockDots');
const unlockMsg   = $('#unlockMsg');
const unlockClear = $('#unlockClear');

const setPassModal = $('#setPassModal');
const setDots   = $('#setDots');
const setMsg    = $('#setMsg');
const setConfirm= $('#setConfirm');
const setClear  = $('#setClear');

const enablePass = $('#enablePass');
const changePass = $('#changePass');
const disablePass= $('#disablePass');

const passBuffers = { unlock: [], set: [] };

function renderDots(container, arr){
  $$('.filled', container).forEach(el=> el.classList.remove('filled'));
  Array.from(container.querySelectorAll('span')).forEach((s,i)=> s.classList.toggle('filled', i < arr.length));
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
              const ok = await verify(buf.join(''));
              if (ok){ hideLock(); passBuffers.unlock=[]; unlockMsg.textContent=''; emit('passcode:unlocked'); }
              else { unlockMsg.textContent = 'Wrong passcode'; }
            }
          }
        } else {
          if (buf.length<8) buf.push(label);
        }
        renderDots(target==='unlock' ? unlockDots : setDots, buf);
      });
      np.appendChild(b);
    });
  });
}

async function set(codeDigits){
  const saltBytes = crypto.getRandomValues(new Uint8Array(8));
  const saltHex = Array.from(saltBytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  const hash = await sha256Hex(saltHex + codeDigits);
  state.lock = { enabled:true, salt:saltHex, hash };
  saveAll();
}

// ⬇️ EXPORTED: verify (named export)
export async function verify(codeDigits){
  if (!state.lock.enabled || !state.lock.salt || !state.lock.hash) return false;
  const h = await sha256Hex(state.lock.salt + codeDigits);
  return h === state.lock.hash;
}

export function showLock(){
  document.body.classList.add('locked');
  lockOverlay.classList.remove('hidden');
  passBuffers.unlock = [];
  renderDots(unlockDots, passBuffers.unlock);
}
export function hideLock(){
  document.body.classList.remove('locked');
  lockOverlay.classList.add('hidden');
}

// ⬇️ EXPORTED: initPasscodeUI (named export)
export function initPasscodeUI(){
  mountNumpads();

  unlockClear.addEventListener('click', ()=>{ passBuffers.unlock=[]; renderDots(unlockDots, passBuffers.unlock); });

  enablePass.addEventListener('click', ()=>{
    setMsg.textContent=''; passBuffers.set=[]; renderDots(setDots, passBuffers.set);
    $('#setPassTitle').textContent = 'Set Passcode';
    setPassModal.classList.remove('hidden');
  });
  changePass.addEventListener('click', ()=>{
    if (!state.lock.enabled){ alert('Passcode not enabled.'); return; }
    setMsg.textContent=''; passBuffers.set=[]; renderDots(setDots, passBuffers.set);
    $('#setPassTitle').textContent = 'Change Passcode';
    setPassModal.classList.remove('hidden');
  });
  disablePass.addEventListener('click', ()=>{
    if (!state.lock.enabled){ alert('Passcode not enabled.'); return; }
    if (confirm('Disable passcode?')){
      state.lock = structuredClone(defaults.lock);
      saveAll(); alert('Passcode disabled.');
    }
  });

  setConfirm.addEventListener('click', async ()=>{
    const code = passBuffers.set.join('');
    if (code.length < 4){ setMsg.textContent = 'Enter at least 4 digits'; return; }
    await set(code);
    setPassModal.classList.add('hidden');
    alert('Passcode saved.');
    emit('passcode:set');
  });
  setClear.addEventListener('click', ()=>{ passBuffers.set=[]; renderDots(setDots, passBuffers.set); });

  // backdrop close
  [setPassModal].forEach(ov=>{
    ov.addEventListener('click', (e)=>{ if (e.target === ov){ ov.classList.add('hidden'); }});
  });

  if (state.lock.enabled) showLock();
}

// ⬇️ EXPORTED: passcodeAPI (named export) — for existing imports
export const passcodeAPI = { verify };
