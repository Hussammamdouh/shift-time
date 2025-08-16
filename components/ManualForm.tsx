'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/types';
import { computeNetMs, fromLocalDT, msToHhMm } from '@/lib/timeUtils';
import AnnotateBar from './AnnotateBar';

type Props = { snap: Snapshot; setSnap: (s: Snapshot) => void };

export default function ManualForm({ snap, setSnap }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);

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
    };

    setSnap({ ...snap, history: [rec, ...snap.history] });
    setStart(''); setEnd(''); setBreaks([]); setNote(''); setTags([]);
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

  return (
    <div className="card space-y-4">
      <div>
        <h2>Manual Entry</h2>
        <small>Calculate working time excluding breaks</small>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label>Start</label>
          <input className="input w-full" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label>End</label>
          <input className="input w-full" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label>Breaks</label>
          <button className="btn" onClick={addBreak}>+ Add break</button>
        </div>
        {breaks.map((b, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <input
              className="input"
              type="datetime-local"
              value={b.start}
              onChange={(e) => { const a=[...breaks]; a[i].start=e.target.value; setBreaks(a); }}
            />
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type="datetime-local"
                value={b.end}
                onChange={(e) => { const a=[...breaks]; a[i].end=e.target.value; setBreaks(a); }}
              />
              <button className="btn bg-red-600 hover:bg-red-500" onClick={() => removeBreak(i)}>Remove</button>
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

      <div className="flex justify-end">
        <button className="btn bg-blue-600 hover:bg-blue-500" onClick={save}>Save Shift</button>
      </div>
    </div>
  );
}
