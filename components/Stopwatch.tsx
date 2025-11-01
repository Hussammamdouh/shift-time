'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Snapshot } from '@/lib/types';
import { msToHhMm, fmtClock, hoursToText } from '@/lib/timeUtils';
import ProgressRing from './ProgressRing';
import SectionHeader from './SectionHeader';
import EditShiftModal from './EditShiftModal';

type Props = { 
  snap: Snapshot; 
  setSnap: (s: Snapshot) => void; 
};

export default function Stopwatch({ snap, setSnap }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { watch } = snap;
  const { status, startTimeMs, breaks } = watch;
  
  const onIdle = status === 'IDLE';
  const onWork = status === 'WORKING';
  const onBreak = status === 'ON_BREAK';
  
  const workedMs = startTimeMs ? now - startTimeMs : 0;
  const breakMs = breaks.reduce((acc, b) => acc + (b.endMs || now) - b.startMs, 0);
  const netMs = Math.max(0, workedMs - breakMs);
  
  const workedHours = netMs / 3600000;
  const totalBreakHours = breakMs / 3600000;
  const targetNetHours = 7; // 7 hours net work daily
  const remainingNetHours = Math.max(0, targetNetHours - workedHours);
  
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const currentEarnings = hourlyRate > 0 ? workedHours * hourlyRate : 0;
  const targetEarnings = hourlyRate > 0 ? targetNetHours * hourlyRate : 0;

  // Helper function to round to 2 decimal places
  const roundToTwo = (num: number) => Math.round(num * 100) / 100;

  function start() {
    setSnap({
      ...snap,
      watch: {
        ...watch,
        status: 'WORKING',
        startTimeMs: now,
        breaks: [],
      },
      updatedAt: now,
    });
  }

  function takeBreak() {
    setSnap({
      ...snap,
      watch: {
        ...watch,
        status: 'ON_BREAK',
        breaks: [...breaks, { startMs: now, endMs: null }],
      },
      updatedAt: now,
    });
  }

  function back() {
    const updatedBreaks = breaks.map((b, i) => 
      i === breaks.length - 1 ? { ...b, endMs: now } : b
    );
    
    setSnap({
      ...snap,
      watch: {
        ...watch,
        status: 'WORKING',
        breaks: updatedBreaks,
      },
      updatedAt: now,
    });
  }

  function end() {
    const updatedBreaks = breaks.map(b => ({ ...b, endMs: b.endMs || now }));
    const endTimeMs = now;
    
    const newShift = {
      id: String(Date.now()),
      startMs: startTimeMs!,
      endMs: endTimeMs,
      netMs: Math.max(0, endTimeMs - startTimeMs! - updatedBreaks.reduce((acc, b) => acc + (b.endMs! - b.startMs), 0)),
      breakMs: updatedBreaks.reduce((acc, b) => acc + (b.endMs! - b.startMs), 0),
      breaks: updatedBreaks,
      note: '',
      tags: [],
      projectId: selectedProjectId || undefined,
      taskId: selectedTaskId || undefined,
    };

    setSnap({
      ...snap,
      watch: {
        status: 'IDLE',
        startTimeMs: null,
        endTimeMs: null,
        breaks: [],
        targetMinutes: snap.prefs.targetMinutes || 420,
      },
      history: [newShift, ...snap.history],
      updatedAt: now,
    });
    
    // Reset project/task selection
    setSelectedProjectId('');
    setSelectedTaskId('');
  }

  const t = msToHhMm(netMs);
  const fmt = snap.prefs.hourFormat || 24;

  return (
    <div className="space-y-8">
      {/* Enhanced Main Timer Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Enhanced Central Timer Card */}
        <div className="xl:col-span-2 card text-center space-y-8 tilt">
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-8">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-500 rounded-3xl flex items-center justify-center shadow-glow-green float ${onWork ? 'pulse-glow' : ''}`}>
                <svg className="w-12 h-12 sm:w-14 sm:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-4xl sm:text-5xl font-bold text-gradient">
                  Active Timer
                </h2>
                <p className="text-slate-400 text-xl">Track your work session</p>
              </div>
            </div>

            {/* Enhanced Progress Ring */}
            <div className="flex flex-col items-center gap-8">
              <ProgressRing
                progress={Math.min(workedHours / targetNetHours, 1)}
                label={t.text}
                sublabel={
                  workedHours >= targetNetHours 
                    ? `${hoursToText(targetNetHours)} target met! ✓` 
                    : workedHours >= targetNetHours * 0.9 
                    ? 'Almost there…' 
                    : 'Keep going!'
                }
              />
              
              {/* Enhanced Quick Status Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-lg">
                <div className="card-hover text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-blue-500/50">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {hoursToText(workedHours)}
                  </div>
                  <div className="text-slate-400 font-medium">Worked</div>
                </div>
                <div className="card-hover text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-yellow-500/50">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {hoursToText(totalBreakHours)}
                  </div>
                  <div className="text-slate-400 font-medium">Breaks</div>
                </div>
                <div className="card-hover text-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-green-500/50">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {hoursToText(remainingNetHours)}
                  </div>
                  <div className="text-slate-400 font-medium">Remaining</div>
                </div>
              </div>
              
              {/* Enhanced Target Achievement Indicator */}
              {workedHours >= targetNetHours && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-3xl px-8 py-6 text-center animate-in slide-in-from-bottom-2 duration-500">
                  <div className="text-3xl font-bold text-emerald-400 mb-3">🎉 Target Achieved!</div>
                  <div className="text-emerald-300 text-lg">You&apos;ve completed your {hoursToText(targetNetHours)} net working time goal</div>
                </div>
              )}
              
              {/* Enhanced Status indicator */}
              <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <div className={`w-5 h-5 rounded-full ${onIdle ? 'status-idle' : onWork ? 'status-working' : 'status-break'}`}></div>
                <span className="text-slate-300 font-semibold text-xl">
                  {status === 'IDLE' ? 'Ready to start' : status === 'WORKING' ? 'Working' : 'On break'}
                </span>
              </div>
              
              {/* Enhanced Earnings Display */}
              {hourlyRate > 0 && (
                <div className="text-center space-y-4 p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                  <div className="text-4xl font-bold text-emerald-400">
                    {roundToTwo(currentEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
                  </div>
                  <div className="text-slate-400 text-lg">{hoursToText(workedHours)} × {roundToTwo(hourlyRate).toFixed(2)} {snap.prefs.currency || 'EGP'}/hour</div>
                  {targetEarnings > 0 && (
                    <div className="text-sm text-slate-500">
                      Target: {roundToTwo(targetEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Stats & Info Sidebar */}
        <div className="space-y-6">
          {/* Enhanced Target & Progress */}
          <div className="card space-y-6 tilt">
            <SectionHeader
              title="Session Goals"
              icon={(
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                <span className="text-slate-400">Target Net Time</span>
                <span className="font-mono font-bold text-violet-400">{hoursToText(targetNetHours)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                <span className="text-slate-400">Progress</span>
                <span className="font-mono font-bold text-emerald-400">{Math.round((workedHours / targetNetHours) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                <span className="text-slate-400">Remaining</span>
                <span className="font-mono font-bold text-blue-400">{hoursToText(Math.max(0, targetNetHours - workedHours))}</span>
              </div>
              <div className="section-divider" />
              {/* Sidebar Session Controls (desktop/tablet) */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className={`btn ${onIdle ? 'btn-success' : 'btn-secondary'} h-12 text-sm font-semibold`} 
                  onClick={start} 
                  disabled={!onIdle}
                >
                  Start
                </button>
                <button 
                  className="btn btn-secondary h-12 text-sm font-semibold" 
                  onClick={takeBreak} 
                  disabled={!onWork}
                >
                  Break
                </button>
                <button 
                  className="btn btn-secondary h-12 text-sm font-semibold" 
                  onClick={back} 
                  disabled={!onBreak}
                >
                  Back
                </button>
                <button 
                  className="btn btn-danger h-12 text-sm font-semibold" 
                  onClick={end} 
                  disabled={onIdle}
                >
                  End
                </button>
                <button 
                  className="btn btn-ghost col-span-2 h-12 text-sm font-semibold" 
                  onClick={() => setEditOpen(true)} 
                  disabled={onIdle}
                >
                  Edit Session
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Session Info */}
          {startTimeMs && (
            <>
              <div className="card space-y-6 tilt">
                <SectionHeader
                  title="Session Details"
                  icon={(
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                    <span className="text-slate-400">Started</span>
                    <span className="font-mono text-slate-200">{fmtClock(startTimeMs, fmt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-mono text-slate-200">{t.text}</span>
                  </div>
                  
                  {/* Enhanced Earnings Info */}
                  {hourlyRate > 0 && (
                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors duration-300">
                      <span className="text-slate-400">Current Earnings</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {roundToTwo(currentEarnings).toFixed(2)} {snap.prefs.currency || 'EGP'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Project/Task Assignment */}
              {(snap.projects?.length || 0) > 0 && (
                <div className="card space-y-4">
                  <SectionHeader
                    title="Assign to Project"
                    subtitle="Optional: Link this shift to a project or task"
                    icon={(
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="form-label">Project</label>
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
                      <label className="form-label">Task</label>
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
            </>
          )}
        </div>
      </div>

      {/* Enhanced Control Panel (desktop/tablet) moved to sidebar under Session Goals */}

      {/* Mobile Sticky Control Bar */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 px-4 z-40">
        <div className="glass-nav rounded-2xl p-3 border border-slate-700/40">
          <div className="grid grid-cols-4 gap-3">
            <button 
              className={`btn ${onIdle ? 'btn-success' : 'btn-secondary'} h-14 text-sm font-semibold`} 
              onClick={start} 
              disabled={!onIdle}
            >
              Start
            </button>
            <button 
              className="btn btn-secondary h-14 text-sm font-semibold" 
              onClick={takeBreak} 
              disabled={!onWork}
            >
              Break
            </button>
            <button 
              className="btn btn-secondary h-14 text-sm font-semibold" 
              onClick={back} 
              disabled={!onBreak}
            >
              Back
            </button>
            <button 
              className="btn btn-danger h-14 text-sm font-semibold" 
              onClick={end} 
              disabled={onIdle}
            >
              End
            </button>
          </div>
          <div className="mt-3">
            <button 
              className="btn btn-ghost w-full h-12 text-sm font-semibold" 
              onClick={() => setEditOpen(true)} 
              disabled={onIdle}
            >
              Edit Session
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating FAB */}
      <button
        className={`md:hidden fixed bottom-6 right-6 z-50 rounded-full shadow-2xl focus-ring tilt ${onIdle ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white px-6 h-14`}
        onClick={() => (onIdle ? start() : end())}
      >
        {onIdle ? 'Start' : 'End'}
      </button>

      {/* Enhanced Break Tracking & Shift Guidance */}
      {breaks.length > 0 && (
        <div className="card space-y-6 tilt">
          <SectionHeader
            title="Break Management"
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {breaks.map((break_, index) => (
              <div key={index} className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Break {index + 1}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    break_.endMs 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {break_.endMs ? 'Completed' : 'Active'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-slate-400">Start: </span>
                    <span className="font-mono text-slate-200">{fmtClock(break_.startMs, fmt)}</span>
                  </div>
                  {break_.endMs && (
                    <div className="text-sm">
                      <span className="text-slate-400">End: </span>
                      <span className="font-mono text-slate-200">{fmtClock(break_.endMs, fmt)}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-slate-400">Duration: </span>
                    <span className="font-mono text-slate-200">
                      {break_.endMs 
                        ? msToHhMm(break_.endMs - break_.startMs).text
                        : msToHhMm(now - break_.startMs).text
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Progress Tracking */}
      {startTimeMs && (
        <div className="card space-y-6 tilt">
          <SectionHeader
            title="Progress Tracking"
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
              <div className="text-sm text-slate-400 mb-2">Current Progress</div>
              <div className="text-3xl font-bold text-emerald-400">
                {Math.round((workedHours / targetNetHours) * 100)}%
              </div>
              <div className="text-xs text-slate-500">{hoursToText(workedHours)} of {hoursToText(targetNetHours)} target</div>
            </div>
            
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:bg-slate-800/70 transition-colors duration-300">
              <div className="text-sm text-slate-400 mb-2">Estimated End Time</div>
              <div className="text-3xl font-bold text-blue-400">
                {workedHours >= targetNetHours 
                  ? 'Target Met!' 
                  : (() => {
                      // Calculate total session duration needed (including breaks) to achieve target net hours
                      const totalBreakTimeMs = breaks.reduce((acc, b) => acc + (b.endMs || now) - b.startMs, 0);
                      const totalSessionDurationMs = (targetNetHours * 3600000) + totalBreakTimeMs;
                      const estimatedEndTime = startTimeMs + totalSessionDurationMs;
                      return fmtClock(estimatedEndTime, fmt);
                    })()
                }
              </div>
              <div className="text-xs text-slate-500">{workedHours >= targetNetHours ? 'You\'ve exceeded your daily goal' : `${hoursToText(remainingNetHours)} remaining`}</div>
            </div>
          </div>
        </div>
      )}

      <EditShiftModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        target={useMemo(() => ({ kind: 'current' as const }), [])}
        snap={snap}
        setSnap={setSnap}
      />
    </div>
  );
}
