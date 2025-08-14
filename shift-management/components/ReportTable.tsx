'use client';
import { useState } from 'react';
import type { Snapshot, HistoryRec } from '@/lib/types';
import { downloadCSV, downloadSummaryCSV } from '@/lib/csv';
import { shiftSummary } from '@/lib/timeUtils';
import EditShiftModal from './EditShiftModal';

type Props = { 
  snap: Snapshot; 
  setSnap: (s: Snapshot) => void; 
  onDelete: (id: string) => void;
};

export default function ReportTable({ snap, setSnap, onDelete }: Props) {
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'breaks'>('date');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ kind: 'history', id: string, record: HistoryRec } | null>(null);

  // Calculate statistics
  const totalShifts = snap.history.length;
  const totalHours = snap.history.reduce((a, r) => a + r.netMs, 0) / 3600000;
  const totalMinutes = Math.floor(totalHours * 60);
  const averageShiftLength = totalShifts > 0 ? totalHours / totalShifts : 0;
  const totalBreakTime = snap.history.reduce((a, r) => a + r.breakMs, 0) / 3600000;
  
  // Calculate earnings
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const totalEarnings = hourlyRate > 0 ? totalHours * hourlyRate : 0;
  const averageEarningsPerShift = totalShifts > 0 ? totalEarnings / totalShifts : 0;

  // Filter and sort shifts
  const filteredShifts = snap.history
    .filter(shift => !filterTag || shift.tags.includes(filterTag))
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.startMs - a.startMs;
        case 'duration':
          return b.netMs - a.netMs;
        case 'breaks':
          return b.breakMs - a.breakMs;
        default:
          return 0;
      }
    });

  // Get unique tags
  const allTags = Array.from(new Set(snap.history.flatMap(shift => shift.tags)));

  function toggleShiftSelection(id: string) {
    const newSelected = new Set(selectedShifts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedShifts(newSelected);
  }

  function selectAll() {
    if (selectedShifts.size === filteredShifts.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(filteredShifts.map(s => s.id)));
    }
  }

  function exportSelected() {
    if (selectedShifts.size === 0) {
      alert('Please select shifts to export');
      return;
    }
    const shiftsToExport = filteredShifts.filter(s => selectedShifts.has(s.id));
    downloadCSV(shiftsToExport);
  }

  function openEditModal(shift: HistoryRec) {
    setEditTarget({ kind: 'history', id: shift.id, record: shift });
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditTarget(null);
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: snap.prefs.hourFormat === 12
    });
  }

  function formatDuration(ms: number) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="space-y-8">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-purple-500 rounded-xl flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-200">{totalShifts}</div>
          <div className="text-sm text-gray-400">Total Shifts</div>
        </div>

        <div className="card text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto shadow-glow-green">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-200">{totalHours}h</div>
          <div className="text-sm text-gray-400">Total Hours</div>
        </div>

        <div className="card text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto shadow-glow">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-200">{averageShiftLength}h</div>
          <div className="text-sm text-gray-400">Avg. Shift</div>
        </div>

        <div className="card text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
          <div className="text-2xl font-bold text-gray-200">{totalBreakTime.toFixed(1)}h</div>
          <div className="text-sm text-gray-400">Break Time</div>
      </div>

        {/* Earnings Card - Only show if hourly rate is set */}
        {hourlyRate > 0 && (
          <div className="card text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto shadow-glow-green">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {totalEarnings.toFixed(2)} {snap.prefs.currency || 'USD'}
            </div>
            <div className="text-sm text-gray-400">Total Earnings</div>
            <div className="text-xs text-gray-500">
              Avg: {(averageEarningsPerShift).toFixed(2)} {snap.prefs.currency || 'USD'}/shift
            </div>
          </div>
        )}
        </div>

      {/* Filters and Actions */}
      <div className="card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Tag Filter */}
            <div className="flex-1 min-w-0">
              <label className="form-label">Filter by Tag</label>
              <select
                className="input"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
        </div>

            {/* Sort By */}
            <div className="flex-1 min-w-0">
              <label className="form-label">Sort By</label>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'breaks')}
              >
                <option value="date">Date (Newest)</option>
                <option value="duration">Duration (Longest)</option>
                <option value="breaks">Break Time</option>
              </select>
        </div>
      </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              className="btn btn-secondary"
              onClick={selectAll}
            >
              {selectedShifts.size === filteredShifts.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="btn btn-primary"
              onClick={exportSelected}
              disabled={selectedShifts.size === 0}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Selected
            </button>
            <button
              className="btn btn-success"
              onClick={() => downloadSummaryCSV(filteredShifts)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Export All
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Showing {filteredShifts.length} of {totalShifts} shifts</span>
          {filterTag && <span>Filtered by: {filterTag}</span>}
        </div>
      </div>

      {/* Shifts Table */}
      <div className="card space-y-4">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="table-header px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedShifts.size === filteredShifts.length && filteredShifts.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-brand-primary/50"
                  />
                </th>
                <th className="table-header px-4 py-3">Date</th>
                <th className="table-header px-4 py-3">Start Time</th>
                <th className="table-header px-4 py-3">End Time</th>
                <th className="table-header px-4 py-3">Duration</th>
                <th className="table-header px-4 py-3">Break Time</th>
                <th className="table-header px-4 py-3">Tags</th>
                <th className="table-header px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
              {filteredShifts.map((shift) => {
                const summary = shiftSummary(shift.startMs, shift.endMs, shift.breaks, snap.prefs.hourFormat);
              return (
                  <tr key={shift.id} className="table-row">
                    <td className="table-cell px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedShifts.has(shift.id)}
                        onChange={() => toggleShiftSelection(shift.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-primary focus:ring-brand-primary/50"
                      />
                    </td>
                    <td className="table-cell px-4 py-3">
                      <div className="font-medium text-gray-200">{formatDate(shift.startMs)}</div>
                    </td>
                    <td className="table-cell px-4 py-3 font-mono text-gray-300">
                      {formatTime(shift.startMs)}
                    </td>
                    <td className="table-cell px-4 py-3 font-mono text-gray-300">
                      {formatTime(shift.endMs)}
                    </td>
                    <td className="table-cell px-4 py-3">
                      <div className="font-medium text-gray-200">{summary.net}</div>
                    </td>
                    <td className="table-cell px-4 py-3">
                      <div className="text-gray-300">{summary.breakTotal}</div>
                    </td>
                    <td className="table-cell px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {shift.tags.map(tag => (
                          <span key={tag} className="badge badge-primary text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          className="btn btn-ghost btn-sm p-2"
                          onClick={() => openEditModal(shift)}
                          title="Edit Shift"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger btn-sm p-2"
                          onClick={() => onDelete(shift.id)}
                          title="Delete Shift"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

        {filteredShifts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">No shifts found</h3>
            <p className="text-gray-400">
              {filterTag ? `No shifts found with tag "${filterTag}"` : 'Start tracking your time to see shifts here'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Shift Modal */}
      <EditShiftModal
        open={editModalOpen}
        onClose={closeEditModal}
        target={editTarget}
        snap={snap}
        setSnap={setSnap}
      />
    </div>
  );
}
