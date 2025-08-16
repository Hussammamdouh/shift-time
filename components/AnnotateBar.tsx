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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Enhanced Note Input */}
      <div className="space-y-3">
        <label className="form-label flex items-center space-x-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Note (Optional)</span>
        </label>
        <textarea
          className="input w-full min-h-[100px] resize-none"
          placeholder="Add context about your shift... e.g. Late shift, remote work, special project, etc."
          value={note}
          onChange={e=>onChange({ note: e.target.value, tags })}
        />
        {note && (
          <div className="text-xs text-slate-500">
            {note.length} characters
          </div>
        )}
      </div>

      {/* Enhanced Tags Input */}
      <div className="space-y-3">
        <label className="form-label flex items-center space-x-2">
          <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>Tags (Comma-separated)</span>
        </label>
        <input
          className="input w-full"
          placeholder="e.g. office, remote, client-x, project-alpha"
          value={tags.join(', ')}
          onChange={e=>onChange({ note, tags: parseTags(e.target.value) })}
        />
        
        {/* Enhanced Tags Display */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Active tags:</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Help Text */}
        <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <div className="font-medium mb-1">💡 Tagging Tips:</div>
          <ul className="space-y-1 text-slate-400">
            <li>• Use descriptive tags like "remote", "overtime", "project-x"</li>
            <li>• Separate multiple tags with commas</li>
            <li>• Tags help organize and filter your shift history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
