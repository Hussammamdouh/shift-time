'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Snapshot, HistoryRec } from '@/lib/types';
import { computeNetMs, msToHhMm, fmtClock } from '@/lib/timeUtils';
import EditShiftModal from './EditShiftModal';
import ProgressRing from './ProgressRing';

type Props = { snap: Snapshot; setSnap: (s: Snapshot) => void; };

export default function Stopwatch({ snap, setSnap }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const workingMs = useMemo(() => {
    const s = snap.watch.startTimeMs;
    if (!s) return 0;
    const end = snap.watch.endTimeMs ?? Date.now();
    return computeNetMs(s, end, snap.watch.breaks);
  }, [snap.watch.startTimeMs, snap.watch.endTimeMs, snap.watch.breaks]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Force re-render every second to update the display
    }, 1000);
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  function start() {
    if (snap.watch.status !== 'IDLE') return;
    setSnap({
      ...snap,
      watch: { ...snap.watch, status: 'WORKING', startTimeMs: Date.now(), endTimeMs: null, breaks: [] },
    });
  }
  
  function takeBreak() {
    if (snap.watch.status !== 'WORKING') return;
    setSnap({
      ...snap,
      watch: { ...snap.watch, status: 'ON_BREAK', breaks: [...snap.watch.breaks, { startMs: Date.now(), endMs: null }] },
    });
  }
  
  function back() {
    if (snap.watch.status !== 'ON_BREAK') return;
    const br = [...snap.watch.breaks];
    const last = br[br.length - 1];
    if (last && last.endMs == null) last.endMs = Date.now();
    setSnap({ ...snap, watch: { ...snap.watch, status: 'WORKING', breaks: br } });
  }
  
  function end() {
    if (snap.watch.status === 'IDLE') return;
    const now = Date.now();
    const br = snap.watch.breaks.map((b) => (b.endMs == null ? { ...b, endMs: now } : b));
    const start = snap.watch.startTimeMs!;
    const netMs = computeNetMs(start, now, br);
    const breakMs = Math.max(0, (now - start) - netMs);
    const rec: HistoryRec = {
      id: String(now),
      startMs: start, endMs: now,
      breaks: br.filter((b): b is Required<typeof b> => b.endMs != null),
      breakMs, netMs,
      note: '',
      tags: [],
    };
    setSnap({
      ...snap,
      watch: { ...snap.watch, status: 'IDLE', startTimeMs: null, endTimeMs: null, breaks: [] },
      history: [rec, ...snap.history],
      updatedAt: now,
    });
  }

  const t = msToHhMm(workingMs);
  const onIdle = snap.watch.status === 'IDLE';
  const onWork = snap.watch.status === 'WORKING';
  const onBreak = snap.watch.status === 'ON_BREAK';
  const fmt = snap.prefs.hourFormat;

  const targetHours = (snap.prefs.targetMinutes ?? snap.watch.targetMinutes ?? 420) / 60;
  const workedHours = workingMs / 3600000;
  const pct = targetHours ? workedHours / targetHours : 0;
  const near = pct >= 0.9 && pct < 1;
  const over = pct >= 1;

  // Calculate earnings
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const currentEarnings = hourlyRate > 0 ? workedHours * hourlyRate : 0;
  const targetEarnings = hourlyRate > 0 ? targetHours * hourlyRate : 0;

  // Break tracking and shift completion guidance
  const currentBreakMs = snap.watch.breaks.length > 0 && snap.watch.status === 'ON_BREAK' 
    ? Date.now() - snap.watch.breaks[snap.watch.breaks.length - 1].startMs 
    : 0;
  const totalBreakMs = snap.watch.breaks.reduce((acc, b) => {
    if (b.endMs) return acc + (b.endMs - b.startMs);
    return acc;
  }, 0);
  const totalBreakHours = totalBreakMs / 3600000;
  
  // Shift completion guidance (7 hours net working time)
  const targetNetHours = 7; // Your target: 7 hours net working time
  const remainingNetHours = targetNetHours - workedHours;
  const estimatedEndTime = remainingNetHours > 0 && snap.watch.startTimeMs
    ? new Date(snap.watch.startTimeMs + (targetNetHours * 3600000) + totalBreakMs)
    : null;
  
  // Format estimated end time
  const formatEstimatedEnd = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMinutes = Math.floor((diffMs % 3600000) / 60000);
    
    if (diffMs <= 0) return 'Target reached!';
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m from now`;
    return `${diffMinutes}m from now`;
  };

  return (
    <div className="space-y-8">
      {/* Main Timer Dashboard */}  
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Central Timer Card */}
        <div className="lg:col-span-2 card text-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-glow-green">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Active Timer
                </h2>
                <p className="text-gray-400">Track your work session</p>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="flex flex-col items-center gap-6">
              <ProgressRing
                progress={Math.min(workedHours / targetNetHours, 1)}
                label={`${t.hh}:${t.mm}`}
                sublabel={
                  workedHours >= targetNetHours 
                    ? '7h target met! ✓' 
                    : workedHours >= targetNetHours * 0.9 
                    ? 'Almost there…' 
                    : 'Keep going!'
                }
              />
              
              {/* Target Achievement Indicator */}
              {workedHours >= targetNetHours && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-6 py-3 text-center">
                  <div className="text-lg font-bold text-green-400 mb-1">🎉 Target Achieved!</div>
                  <div className="text-sm text-green-300">
                    You&apos;ve completed your 7-hour net working time goal
                  </div>
                </div>
              )}
              
              {/* Status indicator */}
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${onIdle ? 'bg-gray-500' : onWork ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-gray-300 font-medium text-lg">
                  {snap.watch.status === 'IDLE' ? 'Ready to start' : snap.watch.status === 'WORKING' ? 'Working' : 'On break'}
                </span>
              </div>
              
              {/* Earnings Display */}
              {hourlyRate > 0 && (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-400">
                    {currentEarnings.toFixed(2)} {snap.prefs.currency || 'USD'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {workedHours.toFixed(2)}h × {hourlyRate} {snap.prefs.currency || 'USD'}/h
                  </div>
                  {targetEarnings > 0 && (
                    <div className="text-xs text-gray-500">
                      Target: {targetEarnings.toFixed(2)} {snap.prefs.currency || 'USD'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats & Info Sidebar */}
        <div className="space-y-6">
          {/* Target & Progress */}
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Session Goals</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <span className="text-gray-400">Target Net Time</span>
                <span className="font-mono font-semibold text-brand-primary">7.0h</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <span className="text-gray-400">Progress</span>
                <span className="font-mono font-semibold text-green-400">{Math.round((workedHours / targetNetHours) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <span className="text-gray-400">Remaining</span>
                <span className="font-mono font-semibold text-blue-400">
                  {Math.max(0, targetNetHours - workedHours).toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          {snap.watch.startTimeMs && (
            <div className="card space-y-4">
              <h3 className="text-lg font-semibold text-gray-200">Session Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <span className="text-gray-400">Started</span>
                  <span className="font-mono text-gray-200">{fmtClock(snap.watch.startTimeMs, fmt)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <span className="text-gray-400">Duration</span>
                  <span className="font-mono text-gray-200">{workedHours.toFixed(2)}h</span>
                </div>
                
                {/* Earnings Info */}
                {hourlyRate > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <span className="text-gray-400">Current Earnings</span>
                    <span className="font-mono font-semibold text-green-400">
                      {currentEarnings.toFixed(2)} {snap.prefs.currency || 'USD'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Break Tracking & Shift Guidance */}
      <div className="card space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Break Management & Shift Guidance</h3>
          <p className="text-gray-400">Track your breaks and know when to end your shift</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Break Status */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-200">
                {snap.watch.status === 'ON_BREAK' ? 'On Break' : 'Not on Break'}
              </div>
              {snap.watch.status === 'ON_BREAK' && (
                <div className="text-sm text-yellow-400 font-mono">
                  {(currentBreakMs / 60000).toFixed(1)}m
                </div>
              )}
            </div>
          </div>

          {/* Total Break Time */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-200">
                Total Breaks
              </div>
              <div className="text-sm text-orange-400 font-mono">
                {totalBreakHours.toFixed(1)}h
              </div>
            </div>
          </div>

          {/* Progress to 7-hour Target */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-200">
                Target Progress
              </div>
              <div className="text-sm text-blue-400 font-mono">
                {workedHours.toFixed(1)}h / 7.0h
              </div>
              <div className="text-xs text-gray-400">
                {Math.round((workedHours / targetNetHours) * 100)}% Complete
              </div>
            </div>
          </div>

          {/* Estimated End Time */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-gray-200">
                End Shift At
              </div>
              {estimatedEndTime ? (
                <div className="text-sm text-green-400 font-mono">
                  {estimatedEndTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: snap.prefs.hourFormat === 12 
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  {workedHours >= targetNetHours ? 'Target reached!' : 'Start working'}
                </div>
              )}
              {estimatedEndTime && (
                <div className="text-xs text-gray-400">
                  {formatEstimatedEnd(estimatedEndTime)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Break History */}
        {snap.watch.breaks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-gray-200">Break History</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {snap.watch.breaks.map((breakItem, index) => {
                const breakDuration = breakItem.endMs 
                  ? (breakItem.endMs - breakItem.startMs) / 60000
                  : (Date.now() - breakItem.startMs) / 60000;
                const isActive = !breakItem.endMs;
                
                return (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      isActive 
                        ? 'bg-yellow-500/10 border-yellow-500/30' 
                        : 'bg-gray-800/50 border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Break {index + 1}
                      </div>
                      <div className={`text-sm font-mono ${
                        isActive ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {breakDuration.toFixed(1)}m
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(breakItem.startMs).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: snap.prefs.hourFormat === 12 
                      })}
                      {breakItem.endMs && (
                        <> - {new Date(breakItem.endMs).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: snap.prefs.hourFormat === 12 
                        })}</>
                      )}
                    </div>
                    {isActive && (
                      <div className="text-xs text-yellow-400 mt-1 animate-pulse">
                        Active break
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="card space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Session Controls</h3>
          <p className="text-gray-400">Manage your work session</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <button 
            className={`btn ${onIdle ? 'btn-success' : 'btn-secondary'} col-span-2 sm:col-span-1 h-14`} 
            onClick={start} 
            disabled={!onIdle}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start
          </button>
          
          <button 
            className="btn btn-secondary h-14" 
            onClick={takeBreak} 
            disabled={!onWork}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Break
          </button>
          
          <button 
            className="btn btn-secondary h-14" 
            onClick={back} 
            disabled={!onBreak}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Back
          </button>
          
          <button 
            className="btn btn-danger h-14" 
            onClick={end} 
            disabled={onIdle}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            End
          </button>
          
          <button 
            className="btn btn-ghost col-span-2 sm:col-span-1 h-14" 
            onClick={() => setEditOpen(true)} 
            disabled={onIdle}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Session
          </button>
        </div>
      </div>

      <EditShiftModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        target={{ kind: 'current' }}
        snap={snap}
        setSnap={setSnap}
      />
    </div>
  );
}
