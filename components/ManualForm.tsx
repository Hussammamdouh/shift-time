'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { computeNetMs, fromLocalDT, msToHhMm } from '@/lib/timeUtils';
import AnnotateBar from './AnnotateBar';
import SectionHeader from './SectionHeader';

type Props = { snap: Snapshot; setSnap: (s: Snapshot) => void };

export default function ManualForm({ snap, setSnap }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  function addBreak() { setBreaks([...breaks, { start: '', end: '' }]); }
  function removeBreak(i: number) { const a = [...breaks]; a.splice(i, 1); setBreaks(a); }

  function save() {
    const s = fromLocalDT(start);
    const e = fromLocalDT(end);
    if (!s || !e || e <= s) return;

    const br = breaks
      .map((b) => ({ startMs: fromLocalDT(b.start), endMs: fromLocalDT(b.end) }))
      .filter((b): b is { startMs: number; endMs: number } => !!b.startMs && !!b.endMs && b.endMs > b.startMs);

    const netMs = computeNetMs(s, e, br);
    const breakMs = Math.max(0, (e - s) - netMs);

    const rec = {
      id: String(Date.now()),
      startMs: s,
      endMs: e,
      breaks: br,
      breakMs,
      netMs,
      note,
      tags,
      projectId: selectedProjectId || undefined,
      taskId: selectedTaskId || undefined,
    };

    setSnap({ ...snap, history: [rec, ...snap.history] });
    setStart(''); setEnd(''); setBreaks([]); setNote(''); setTags([]);
    setSelectedProjectId(''); setSelectedTaskId('');
  }

  // Preview
  const preview = (() => {
    const s = fromLocalDT(start);
    const e = fromLocalDT(end);
    if (!s || !e || e <= s) return null;
    const br = breaks
      .map((b) => ({ startMs: fromLocalDT(b.start), endMs: fromLocalDT(b.end) }))
      .filter((b): b is { startMs: number; endMs: number } => !!b.startMs && !!b.endMs && b.endMs > b.startMs);
    const netMs = computeNetMs(s, e, br);
    const breakMs = Math.max(0, (e - s) - netMs);
    return { net: msToHhMm(netMs).text, br: msToHhMm(breakMs).text };
  })();

  const isFormValid = start && end && fromLocalDT(start) && fromLocalDT(end) && fromLocalDT(end)! > fromLocalDT(start)!;
  const hasFormData = start || end || breaks.length > 0 || note || tags.length > 0;

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="card space-y-6">
        <SectionHeader
          title="Manual Entry"
          subtitle="Calculate working time excluding breaks"
          size="lg"
          icon={(
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        />

        {/* Enhanced Time Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="form-label flex items-center space-x-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Start Time</span>
            </label>
            <input 
              className="input text-lg" 
              type="datetime-local" 
              value={start} 
              onChange={(e) => setStart(e.target.value)} 
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
              className="input text-lg" 
              type="datetime-local" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Enhanced Breaks Section */}
      <div className="card space-y-6">
        <SectionHeader
          title="Break Management"
          subtitle="Add and manage break periods"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          actions={(
            <button 
              className={`btn btn-sm ${start && end ? 'btn-primary' : 'btn-secondary'}`}
              onClick={addBreak}
              disabled={!start || !end}
              title={!start || !end ? 'Set start and end times first' : 'Add a break period'}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Break
            </button>
          )}
        />

        {breaks.length === 0 && (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No breaks added yet</p>
            <p className="text-sm">Click &quot;Add Break&quot; to start tracking break periods</p>
          </div>
        )}

        {breaks.map((b, i) => (
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
                onClick={() => removeBreak(i)}
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
                  className="input"
                  type="datetime-local"
                  value={b.start}
                  onChange={(e) => { const a=[...breaks]; a[i].start=e.target.value; setBreaks(a); }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Break End</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={b.end}
                  onChange={(e) => { const a=[...breaks]; a[i].end=e.target.value; setBreaks(a); }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project/Task Assignment */}
      {(snap.projects?.length || 0) > 0 && (
        <div className="card space-y-6">
          <SectionHeader
            title="Project & Task"
            subtitle="Assign this shift to a project or task"
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="form-label">Project (optional)</label>
              <select
                className="input"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedTaskId(''); // Reset task when project changes
                }}
              >
                <option value="">No project</option>
                {snap.projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="form-label">Task (optional)</label>
              <select
                className="input"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={!selectedProjectId}
              >
                <option value="">No task</option>
                {snap.tasks?.filter(t => t.projectId === selectedProjectId).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Annotations */}
      <div className="card space-y-6">
        <SectionHeader
          title="Notes & Tags"
          subtitle="Add context and organization"
          icon={(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        />
        
        <AnnotateBar
          note={note}
          tags={tags}
          onChange={({note, tags})=>{ setNote(note); setTags(tags); }}
        />
      </div>

      {/* Enhanced Preview */}
      {preview && (
        <div className="card space-y-4">
          <SectionHeader
            title="Time Summary"
            subtitle="Preview of your shift calculation"
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          />
          
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

      {/* Enhanced Action Buttons */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold text-slate-200">Save Your Shift</h3>
            <p className="text-sm text-slate-400">
              {isFormValid 
                ? "All set! Your shift data is ready to save." 
                : "Please fill in the start and end times to continue."
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              className={`btn ${hasFormData ? 'btn-secondary' : 'btn-secondary'}`}
              onClick={() => {
                setStart(''); 
                setEnd(''); 
                setBreaks([]); 
                setNote(''); 
                setTags([]);
              }}
              disabled={!hasFormData}
              title={!hasFormData ? 'No data to reset' : 'Clear all form data'}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
            
            <button 
              className={`btn ${isFormValid ? 'btn-success' : 'btn-secondary'}`}
              onClick={save}
              disabled={!isFormValid}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Shift
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
