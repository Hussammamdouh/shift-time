'use client';
import { parseTags } from '@/lib/tags';

export default function AnnotateBar({
  note, tags, onChange
}:{
  note: string;
  tags: string[];
  onChange: (next: { note: string; tags: string[] }) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label>Note (optional)</label>
        <input
          className="input w-full"
          placeholder="e.g. Late shift, remote"
          value={note}
          onChange={e=>onChange({ note: e.target.value, tags })}
        />
      </div>
      <div>
        <label>Tags (comma-separated)</label>
        <input
          className="input w-full"
          placeholder="e.g. office,client-x"
          value={tags.join(', ')}
          onChange={e=>onChange({ note, tags: parseTags(e.target.value) })}
        />
      </div>
    </div>
  );
}
