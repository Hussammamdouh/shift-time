'use client';
import { useEffect, useState } from 'react';
import type { Snapshot, HistoryRec } from '@/lib/types';
import { fromLocalDT, toLocalDT, computeNetMs, msToHhMm } from '@/lib/timeUtils';
import AnnotateBar from './AnnotateBar';

type ModalTarget =
  | { kind: 'current' }
  | { kind: 'history', id: string, record: HistoryRec };

export default function EditShiftModal({
  open, onClose, target, snap, setSnap
}:{
  open: boolean;
  onClose: ()=>void;
  target: ModalTarget | null;
  snap: Snapshot;
  setSnap: (s: Snapshot)=>void;
}) {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [breaks, setBreaks] = useState<{start:string; end:string}[]>([]);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(()=>{
    if (!open || !target) return;
    setError('');

    if (target.kind === 'current') {
      const ws = snap.watch;
      setStart(toLocalDT(ws.startTimeMs ?? Date.now()));
      setEnd(ws.endTimeMs ? toLocalDT(ws.endTimeMs) : '');
      const br = (ws.breaks||[]).map(b => ({ start: toLocalDT(b.startMs), end: b.endMs ? toLocalDT(b.endMs) : '' }));
      setBreaks(br.length ? br : []);
      setNote('');
      setTags([]);
    } else {
      const r = target.record;
      setStart(toLocalDT(r.startMs));
      setEnd(toLocalDT(r.endMs));
      setBreaks((r.breaks||[]).map(b=>({ start: toLocalDT(b.startMs), end: toLocalDT(b.endMs) })));
      setNote(r.note || '');
      setTags(r.tags || []);
    }
  }, [open, target, snap]);

  function addBreak(){ setBreaks([...breaks, {start:'', end:''}]); }
  function rmBreak(i:number){ const a=[...breaks]; a.splice(i,1); setBreaks(a); }

  function save(){
    const s = fromLocalDT(start);
    const e = fromLocalDT(end||'');
    if (!s) { setError('Start is required'); return; }
    if (target?.kind === 'history' && !e){ setError('End is required for history record'); return; }
    if (e && e <= s){ setError('End must be after Start'); return; }

    const br = breaks.map(b=>({
      startMs: fromLocalDT(b.start)||0,
      endMs: b.end ? fromLocalDT(b.end) : null
    })).filter(b => b.startMs && (b.endMs==null || (b.endMs > b.startMs)));

    if (target?.kind === 'current') {
      const newWatch = {
        ...snap.watch,
        startTimeMs: s,
        endTimeMs: e || null,
        breaks: br
      };
      const next = { ...snap, watch: newWatch, updatedAt: Date.now() };
      setSnap(next);
      onClose();
      return;
    }

    if (target?.kind === 'history') {
      const endMs = e!;
      const netMs = computeNetMs(s, endMs, br);
      const breakMs = Math.max(0, (endMs - s) - netMs);
      const rec: HistoryRec = {
        id: target.id,
        startMs: s, endMs,
        breaks: br.filter((x): x is {startMs:number; endMs:number} => x.endMs!=null) as HistoryRec['breaks'],
        breakMs, netMs,
        note, tags,
      };
      const next = {
        ...snap,
        history: snap.history.map(r => r.id===target.id ? rec : r),
        updatedAt: Date.now()
      };
      setSnap(next);
      onClose();
      return;
    }
  }

  const preview = (() => {
    const s = fromLocalDT(start);
    const e = fromLocalDT(end||'');
    if (!s || !e || e<=s) return null;
    const br = breaks.map(b=>({ startMs: fromLocalDT(b.start)||0, endMs: fromLocalDT(b.end)||0 }))
      .filter(b=> b.startMs && b.endMs && b.endMs>b.startMs);
    const netMs = computeNetMs(s,e,br);
    const breakMs = Math.max(0, (e - s) - netMs);
    return { net: msToHhMm(netMs).text, br: msToHhMm(breakMs).text };
  })();

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-2xl card" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2>Edit {target.kind==='current' ? 'Current Shift' : 'Shift'}</h2>
            <small>Adjust start/end and breaks</small>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label>Start</label>
            <input className="input w-full" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} />
          </div>
          <div>
            <label>End</label>
            <input className="input w-full" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label>Breaks</label>
            <button className="btn" onClick={addBreak}>+ Add break</button>
          </div>
          {breaks.map((b,i)=>(
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <input className="input" type="datetime-local" value={b.start} onChange={e=>{
                const a=[...breaks]; a[i].start=e.target.value; setBreaks(a);
              }}/>
              <div className="flex gap-2">
                <input className="input flex-1" type="datetime-local" value={b.end} onChange={e=>{
                  const a=[...breaks]; a[i].end=e.target.value; setBreaks(a);
                }}/>
                <button className="btn bg-red-600 hover:bg-red-500" onClick={()=>rmBreak(i)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <AnnotateBar
          note={note}
          tags={tags}
          onChange={({note, tags})=>{ setNote(note); setTags(tags); }}
        />

        {preview && (
          <div className="flex gap-2">
            <span className="pill">Net: {preview.net}</span>
            <span className="pill">Breaks: {preview.br}</span>
          </div>
        )}
        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button className="btn bg-blue-600 hover:bg-blue-500" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
