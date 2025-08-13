// sync.js — P2P sync via WebRTC + manual/QR signaling, passcode-gated
// Enhancements:
// - Role-aware QR (client shows answer)
// - Adaptive paging w/ ECC L (handled in qr.js)
// - Larger QR scale for easier scanning
// - Built-in "Scan QR" camera modal using BarcodeDetector
// - Optional gzip compression for QR payload; auto-decompress on scan

import { $, notify } from './core.js';
import { state, saveAll } from './storage.js';
import { passcodeAPI } from './passcode.js';
import { drawQRWithPaging } from './qr.js';

// DOM refs (existing)
const syncRole      = $('#syncRole');
const syncPass      = $('#syncPass');
const syncStart     = $('#syncStart');

const syncOffer     = $('#syncOffer');
const copyOffer     = $('#copyOffer');
const qrOffer       = $('#qrOffer');
const qrCanvas      = $('#qrCanvas');

const syncAnswer    = $('#syncAnswer');
const acceptAnswer  = $('#acceptAnswer');

const syncStatus    = $('#syncStatus');

// Internal peer state
let pc = null;
let chan = null;

// Base64-safe JSON wrapper (UTF-8 safe)
const enc = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
const dec = (str) => JSON.parse(decodeURIComponent(escape(atob(str))));

function setStatus(text){ syncStatus.textContent = text; }

function resetConn(){
  if (chan){ try{ chan.close(); }catch{} chan = null; }
  if (pc){ try{ pc.close(); }catch{} pc = null; }
}

// Snapshot = everything needed on the other device
function packSnapshot(){
  return {
    watch: state.watch,
    manual: state.manual,
    history: state.history,
    prefs: state.prefs,
  };
}

function applySnapshot(snap){
  state.watch   = snap.watch;
  state.manual  = snap.manual;
  state.history = snap.history;
  state.prefs   = snap.prefs;
  saveAll();
  notify('Synced', 'Snapshot received and applied.');
  window.dispatchEvent(new CustomEvent('sync:applied'));
}

/* ---------------------------
   Optional QR compression
----------------------------*/
const supportsCompression = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function gzipStringToB64(str){
  if (!supportsCompression) return { header: 'raw', payload: str };
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(str));
  await writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { header: 'gz', payload: b64 };
}
async function gunzipB64ToString(b64){
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  await writer.close();
  const text = await new Response(ds.readable).text();
  return text;
}

// Wrap payload for QR
async function wrapForQR(text){
  // If text already has page header pX/N:, don't double-wrap per-page chunks; we wrap the whole thing.
  const { header, payload } = await gzipStringToB64(text);
  // Prefix format: qr1|<gz|raw>|<data>
  return `qr1|${header}|${payload}`;
}

// Unwrap scanned payload
async function unwrapFromQR(text){
  // Accept raw SDP too (no prefix)
  if (!text.startsWith('qr1|')){
    return text.startsWith('p') && text.includes(':') ? text : text; // raw or paged raw
  }
  const parts = text.split('|');
  if (parts.length < 3) return text;
  const mode = parts[1];
  const data = parts.slice(2).join('|'); // in case payload contains |
  if (mode === 'gz'){
    try { return await gunzipB64ToString(data); }
    catch { return ''; }
  } else {
    return data;
  }
}

/* ---------------------------
   Camera Scan UI (no libs)
----------------------------*/
let scanModal, scanVideo, scanCloseBtn, scanInfo, scanAssembleBar;
let mediaStream = null;
let scanning = false;
let pageCollector = null;

function ensureScanUI(){
  if (scanModal) return;
  scanModal = document.createElement('div');
  scanModal.className = 'modal';
  scanModal.id = 'qrScanModal';
  scanModal.innerHTML = `
    <div class="modal-content" style="max-width: 520px;">
      <h3>Scan QR</h3>
      <video id="qrScanVideo" autoplay playsinline style="width:100%; border-radius:12px; background:#000"></video>
      <div id="qrAssemble" class="actions" style="margin-top:8px; display:none;"></div>
      <div class="actions" style="justify-content:space-between;margin-top:8px;">
        <span id="qrScanInfo" class="pill">Point your camera at the QR</span>
        <button id="qrScanClose" class="btn btn-ghost">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(scanModal);
  scanVideo = $('#qrScanVideo');
  scanCloseBtn = $('#qrScanClose');
  scanInfo = $('#qrScanInfo');
  scanAssembleBar = $('#qrAssemble');

  scanModal.addEventListener('click', (e)=>{ if (e.target === scanModal) stopScan(); });
  scanCloseBtn.addEventListener('click', stopScan);
}

async function startScan(role){
  ensureScanUI();

  if (!('BarcodeDetector' in window)){
    alert('QR scanning not supported on this browser. Use copy/paste or a different device.');
    return;
  }

  // Reset multi-page collector
  pageCollector = {
    total: null,
    pages: {},
    got: 0,
    clear(){ this.total=null; this.pages={}; this.got=0; }
  };

  scanAssembleBar.style.display = 'none';
  scanAssembleBar.innerHTML = '';
  scanInfo.textContent = 'Point your camera at the QR';
  scanModal.classList.remove('hidden');

  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    scanVideo.srcObject = mediaStream;
    scanning = true;
    loopScan(role);
  }catch(err){
    alert('Camera access failed. Check permissions.');
    stopScan();
  }
}

async function stopScan(){
  scanning = false;
  if (mediaStream){
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (scanModal) scanModal.classList.add('hidden');
}

async function loopScan(role){
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const tick = async ()=>{
    if (!scanning) return;
    try{
      const codes = await detector.detect(scanVideo);
      if (codes && codes.length){
        const raw = codes[0].rawValue || '';
        await handleScanResult(raw, role);
      }
    }catch{}
    requestAnimationFrame(tick);
  };
  tick();
}

async function handleScanResult(raw, role){
  // Handle paged payloads pX/N:<data>
  let text = raw;
  let paged = false;
  let pIdx=0, pTotal=0, pData='';
  const m = /^p(\d+)\/(\d+):(.*)$/s.exec(raw);
  if (m){
    paged = true;
    pIdx = parseInt(m[1],10);
    pTotal = parseInt(m[2],10);
    pData = m[3];
    // Unwrap (maybe qr1|gz inside)
    const inner = await unwrapFromQR(pData);
    pageCollector.pages[pIdx] = inner;
    if (!pageCollector.total) pageCollector.total = pTotal;
    pageCollector.got = Object.keys(pageCollector.pages).length;

    scanAssembleBar.style.display = '';
    scanAssembleBar.innerHTML = `<span class="pill">Pages ${pageCollector.got} / ${pageCollector.total} scanned</span>`;
    scanInfo.textContent = 'Scan next page…';

    if (pageCollector.got >= pageCollector.total){
      // assemble in order
      let full = '';
      for (let i=1;i<=pageCollector.total;i++){
        full += pageCollector.pages[i] || '';
      }
      await applyScannedText(full, role);
      stopScan();
    }
    return;
  }

  // Single page: maybe wrapped
  const unwrapped = await unwrapFromQR(text);
  await applyScannedText(unwrapped, role);
  stopScan();
}

async function applyScannedText(text, role){
  if (!text) { alert('Scan failed to decode.'); return; }

  // We accept the scanned text as the current role's needed field:
  // - If this device is CLIENT, scanning Host's Offer -> put into syncOffer (left) to auto-create Answer
  // - If this device is HOST, scanning Client's Answer -> put into syncAnswer (right)
  if (role === 'client'){
    syncOffer.value = text;
    // Trigger client auto-answer flow
    const ev = new Event('input', { bubbles: true });
    syncOffer.dispatchEvent(ev);
    scanInfo.textContent = 'Offer pasted. Creating Answer…';
  } else {
    // host
    syncAnswer.value = text;
    scanInfo.textContent = 'Answer pasted. Click "Connect".';
  }
}

/* ---------------------------
   WebRTC peer setup
----------------------------*/
async function createPeer(){
  resetConn();

  // For same-LAN usage, ICE servers can be empty. To work across networks, add STUN:
  // pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  pc = new RTCPeerConnection({ iceServers: [] });

  pc.onicecandidate = (e)=>{
    if (e.candidate) return; // wait until ICE gathering completes
    syncOffer.value = enc({ sdp: pc.localDescription.sdp, type: pc.localDescription.type, role: syncRole.value });
    setStatus('Offer ready. Share it to the other device.');
  };

  pc.onconnectionstatechange = ()=> setStatus(`Connection: ${pc.connectionState}`);

  if (syncRole.value === 'host'){
    chan = pc.createDataChannel('sync');
    attachChannelHandlers('host');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  } else {
    pc.ondatachannel = (e)=>{
      chan = e.channel;
      attachChannelHandlers('client');
    };
  }
}

function attachChannelHandlers(role){
  chan.onopen = ()=> setStatus('Connected. You can fetch/apply data.');
  chan.onmessage = async (e)=>{
    try{
      const msg = JSON.parse(e.data);
      if (msg.type === 'auth'){
        const ok = await passcodeAPI.verify(msg.code);
        chan.send(JSON.stringify({ type:'auth:reply', ok }));
      } else if (msg.type === 'pull'){
        const ok = await passcodeAPI.verify(msg.code);
        if (!ok){ chan.send(JSON.stringify({type:'error', reason:'bad-pass'})); return; }
        chan.send(JSON.stringify({ type:'snapshot', data: packSnapshot() }));
      } else if (msg.type === 'snapshot'){
        applySnapshot(msg.data);
      } else if (msg.type === 'error'){
        setStatus(`Error: ${msg.reason}`);
      }
    } catch {}
  };
  chan.onclose = ()=> setStatus('Channel closed');
  chan.onerror = (e)=> setStatus(`Channel error: ${e.message||e}`);
}

/* ---------------------------
   Init + UI wiring
----------------------------*/
export function initSync(){
  // Start: create offer (host) or prep as client
  syncStart.addEventListener('click', async ()=>{
    if (!syncPass.value){ alert('Enter your numeric passcode.'); return; }
    await createPeer();
    setStatus('Creating offer…');
  });

  // Copy offer text
  copyOffer.addEventListener('click', ()=>{
    navigator.clipboard?.writeText(syncOffer.value);
  });

  // Add "Scan QR" button next to "Show QR"
  let scanBtn = document.getElementById('qrScanBtn');
  if (!scanBtn){
    scanBtn = document.createElement('button');
    scanBtn.id = 'qrScanBtn';
    scanBtn.className = 'btn btn-ghost';
    scanBtn.textContent = 'Scan QR';
    qrOffer.insertAdjacentElement('afterend', scanBtn);
  }
  scanBtn.addEventListener('click', ()=>{
    const role = syncRole.value;
    startScan(role);
  });

  // Show QR (role-aware: client usually displays the ANSWER)
  qrOffer.addEventListener('click', async ()=>{
    const role = syncRole.value;
    const rawTxt = role === 'client'
      ? (syncAnswer.value.trim() || syncOffer.value.trim())
      : syncOffer.value.trim();

    if (!rawTxt){ alert('No offer/answer to encode yet.'); return; }

    // Wrap and (optionally) compress for QR
    const qrPayload = await wrapForQR(rawTxt);

    qrCanvas.classList.remove('hidden');

    // Bigger modules for easier scan; adaptive paging handled in qr.js
    const pager = drawQRWithPaging(qrCanvas, qrPayload, { ecc: 'L', scale: 8, margin: 2 });

    // Build/refresh pager controls
    let pagerBar = qrCanvas.nextElementSibling;
    if (!pagerBar || !pagerBar.classList.contains('qr-pager')){
      pagerBar = document.createElement('div');
      pagerBar.className = 'qr-pager actions';
      qrCanvas.insertAdjacentElement('afterend', pagerBar);
    }
    pagerBar.innerHTML = '';

    if (pager.pages > 1){
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn-ghost btn'; prevBtn.textContent = 'Prev';
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-ghost btn'; nextBtn.textContent = 'Next';
      const pageTag = document.createElement('span');
      pageTag.className = 'pill'; pageTag.textContent = `Page 1 / ${pager.pages}`;

      prevBtn.addEventListener('click', ()=>{
        const idx = pager.prev();
        pageTag.textContent = `Page ${idx+1} / ${pager.pages}`;
      });
      nextBtn.addEventListener('click', ()=>{
        const idx = pager.next();
        pageTag.textContent = `Page ${idx+1} / ${pager.pages}`;
      });

      pagerBar.appendChild(prevBtn);
      pagerBar.appendChild(pageTag);
      pagerBar.appendChild(nextBtn);
    } else {
      const pageTag = document.createElement('span');
      pageTag.className = 'pill'; pageTag.textContent = `1 page`;
      pagerBar.appendChild(pageTag);
    }
  });

  // Host: after receiving client's encoded answer, set it
  acceptAnswer.addEventListener('click', async ()=>{
    try{
      const answer = dec(syncAnswer.value.trim());
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus('Remote answer set. If connection is "connected", you’re good.');
    }catch(e){ setStatus('Bad answer JSON.'); }
  });

  // Client: paste Host offer into the left textarea to auto-generate an answer
  syncOffer.addEventListener('input', async ()=>{
    if (syncRole.value !== 'client') return;
    try{
      const offer = dec(syncOffer.value.trim());
      await createPeer();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      syncAnswer.value = enc({ sdp: pc.localDescription.sdp, type: pc.localDescription.type, role:'client' });
      setStatus('Answer ready. Send back to host, then host presses Connect.');
    } catch(e){ /* ignore parse errors while typing */ }
  });

  // Build fetch/auth buttons area once
  let actionsDiv = syncStatus.nextElementSibling;
  if (!actionsDiv || !actionsDiv.classList.contains('actions')){
    actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    syncStatus.insertAdjacentElement('afterend', actionsDiv);
  }
  actionsDiv.innerHTML = '';

  const clientFetchBtn = document.createElement('button');
  clientFetchBtn.className = 'btn';
  clientFetchBtn.textContent = 'Fetch from Host (client)';

  const hostAuthBtn = document.createElement('button');
  hostAuthBtn.className = 'btn btn-ghost';
  hostAuthBtn.textContent = 'Send Snapshot (host)';

  actionsDiv.appendChild(clientFetchBtn);
  actionsDiv.appendChild(hostAuthBtn);

  clientFetchBtn.addEventListener('click', ()=>{
    if (!chan || chan.readyState!=='open'){ alert('Not connected'); return; }
    if (!syncPass.value){ alert('Enter passcode'); return; }
    chan.send(JSON.stringify({ type:'pull', code: syncPass.value }));
  });

  hostAuthBtn.addEventListener('click', ()=>{
    if (!chan || chan.readyState!=='open'){ alert('Not connected'); return; }
    if (!syncPass.value){ alert('Enter passcode'); return; }
    chan.send(JSON.stringify({ type:'auth', code: syncPass.value }));
  });

  // Clean up
  window.addEventListener('beforeunload', resetConn);
}
