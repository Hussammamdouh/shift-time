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
  const [isFormValid, setIsFormValid] = useState(false);

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

  // Update form validity when form fields change
  useEffect(() => {
    const valid = start.trim() !== '' && end.trim() !== '';
    setIsFormValid(valid);
  }, [start, end]);

  function addBreak(){ setBreaks([...breaks, {start:'', end:''}]); }
  function rmBreak(i:number){ const a=[...breaks]; a.splice(i,1); setBreaks(a); }

  function save(){
    const s = fromLocalDT(start);
    const e = fromLocalDT(end||'');
    
    if (!s) { 
      setError('Start is required'); 
      return; 
    }
    if (target?.kind === 'history' && !e){ 
      setError('End is required for history record'); 
      return; 
    }
    if (e && e <= s){ 
      setError('End must be after Start'); 
      return; 
    }

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl card space-y-8 p-8" onClick={e=>e.stopPropagation()}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-200">
                Edit {target.kind==='current' ? 'Current Shift' : 'Shift Record'}
              </h2>
              <p className="text-slate-400">Adjust start/end times and manage break periods</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        {/* Enhanced Time Inputs */}
        <div className="card space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Time Configuration</h3>
              <p className="text-sm text-slate-400">Set the start and end times for your shift</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Start Time</span>
              </label>
              <input 
                className="input w-full text-lg" 
                type="datetime-local" 
                value={start} 
                onChange={e=>setStart(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <label className="form-label flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>End Time</span>
              </label>
              <input 
                className="input w-full text-lg" 
                type="datetime-local" 
                value={end} 
                onChange={e=>setEnd(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Enhanced Breaks Management */}
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Break Management</h3>
                <p className="text-sm text-slate-400">Add and manage break periods during your shift</p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={addBreak}
              disabled={!start || !end}
              title={!start || !end ? 'Please set start and end times first' : 'Add a break'}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Break
            </button>
          </div>
          
          {breaks.length === 0 && (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No breaks added yet</p>
              <p className="text-sm">Click &quot;Add Break&quot; to start tracking break periods</p>
            </div>
          )}
          
          {breaks.map((b,i)=>(
            <div key={i} className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{i + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-300">Break {i + 1}</span>
                </div>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={()=>rmBreak(i)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Break Start</label>
                  <input 
                    className="input w-full" 
                    type="datetime-local" 
                    value={b.start} 
                    onChange={e=>{
                      const a=[...breaks]; a[i].start=e.target.value; setBreaks(a);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Break End</label>
                  <input 
                    className="input w-full" 
                    type="datetime-local" 
                    value={b.end} 
                    onChange={e=>{
                      const a=[...breaks]; a[i].end=e.target.value; setBreaks(a);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Annotations */}
        <div className="card space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Notes & Tags</h3>
              <p className="text-sm text-slate-400">Add context and organization to your shift</p>
            </div>
          </div>
          
          <AnnotateBar
            note={note}
            tags={tags}
            onChange={({note, tags})=>{ setNote(note); setTags(tags); }}
          />
        </div>

        {/* Enhanced Preview */}
        {preview && (
          <div className="card space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Time Summary</h3>
                <p className="text-sm text-slate-400">Preview of your shift calculation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <div className="text-sm text-emerald-400 mb-1">Net Working Time</div>
                <div className="text-2xl font-bold text-emerald-400">{preview.net}</div>
              </div>
              <div className="p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <div className="text-sm text-yellow-400 mb-1">Total Break Time</div>
                <div className="text-2xl font-bold text-yellow-400">{preview.br}</div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <div className="text-center p-4 bg-red-500/20 rounded-xl border border-red-500/30">
            <div className="flex items-center justify-center space-x-2 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-700/50">
          <button className="btn btn-secondary" onClick={onClose}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
                      <button 
              className={`btn ${isFormValid ? 'btn-success' : 'btn-secondary'}`} 
              onClick={save}
              disabled={!isFormValid}
              title={!isFormValid ? 'Please fill in all required fields' : 'Save your changes'}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
        </div>
      </div>
    </div>
  );
}
