'use client';

import { useMemo } from 'react';
import type { Snapshot } from '../lib/types';
import { hoursToText } from '../lib/timeUtils';
import { formatCurrency } from '../lib/dashboard';

interface AdvancedReportsProps {
  snap: Snapshot;
}

export default function AdvancedReports({ snap }: AdvancedReportsProps) {
  const hourlyRate = snap.prefs.hourlyRate || 0;
  const overtimeRate = snap.prefs.overtimeRate || hourlyRate;
  const overtimeThreshold = snap.prefs.overtimeThreshold || 7;

  // Weekly Summary
  const weeklyData = useMemo(() => {
    const weeks: { [key: string]: { hours: number; earnings: number; shifts: number; overtimeHours: number } } = {};
    
    snap.history.forEach(shift => {
      const date = new Date(shift.startMs);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const hours = shift.netMs / 3600000;
      const regularHours = Math.min(hours, overtimeThreshold);
      const otHours = Math.max(0, hours - overtimeThreshold);
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { hours: 0, earnings: 0, shifts: 0, overtimeHours: 0 };
      }
      weeks[weekKey].hours += hours;
      weeks[weekKey].earnings += (regularHours * hourlyRate) + (otHours * overtimeRate);
      weeks[weekKey].shifts += 1;
      weeks[weekKey].overtimeHours += otHours;
    });

    return Object.entries(weeks)
      .map(([date, data]) => ({
        week: date,
        ...data,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-52); // Last 52 weeks
  }, [snap.history, hourlyRate, overtimeRate, overtimeThreshold]);

  // Monthly Summary
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { hours: number; earnings: number; shifts: number; overtimeHours: number } } = {};
    
    snap.history.forEach(shift => {
      const date = new Date(shift.startMs);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const hours = shift.netMs / 3600000;
      const regularHours = Math.min(hours, overtimeThreshold);
      const otHours = Math.max(0, hours - overtimeThreshold);
      
      if (!months[monthKey]) {
        months[monthKey] = { hours: 0, earnings: 0, shifts: 0, overtimeHours: 0 };
      }
      months[monthKey].hours += hours;
      months[monthKey].earnings += (regularHours * hourlyRate) + (otHours * overtimeRate);
      months[monthKey].shifts += 1;
      months[monthKey].overtimeHours += otHours;
    });

    return Object.entries(months)
      .map(([date, data]) => ({
        month: date,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [snap.history, hourlyRate, overtimeRate, overtimeThreshold]);

  // Yearly Summary
  const yearlyData = useMemo(() => {
    const years: { [key: string]: { hours: number; earnings: number; shifts: number; overtimeHours: number } } = {};
    
    snap.history.forEach(shift => {
      const date = new Date(shift.startMs);
      const yearKey = String(date.getFullYear());
      
      const hours = shift.netMs / 3600000;
      const regularHours = Math.min(hours, overtimeThreshold);
      const otHours = Math.max(0, hours - overtimeThreshold);
      
      if (!years[yearKey]) {
        years[yearKey] = { hours: 0, earnings: 0, shifts: 0, overtimeHours: 0 };
      }
      years[yearKey].hours += hours;
      years[yearKey].earnings += (regularHours * hourlyRate) + (otHours * overtimeRate);
      years[yearKey].shifts += 1;
      years[yearKey].overtimeHours += otHours;
    });

    return Object.entries(years)
      .map(([date, data]) => ({
        year: date,
        ...data,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [snap.history, hourlyRate, overtimeRate, overtimeThreshold]);

  // Project Summary
  const projectData = useMemo(() => {
    const projects: { [key: string]: { hours: number; earnings: number; shifts: number; name?: string; color?: string } } = {};
    
    snap.history.forEach(shift => {
      if (!shift.projectId) {
        if (!projects['none']) {
          projects['none'] = { hours: 0, earnings: 0, shifts: 0, name: 'No Project', color: '#64748b' };
        }
        const hours = shift.netMs / 3600000;
        const regularHours = Math.min(hours, overtimeThreshold);
        const otHours = Math.max(0, hours - overtimeThreshold);
        projects['none'].hours += hours;
        projects['none'].earnings += (regularHours * hourlyRate) + (otHours * overtimeRate);
        projects['none'].shifts += 1;
        return;
      }

      const project = snap.projects?.find(p => p.id === shift.projectId);
      const projectKey = shift.projectId;
      
      const hours = shift.netMs / 3600000;
      const regularHours = Math.min(hours, overtimeThreshold);
      const otHours = Math.max(0, hours - overtimeThreshold);
      
      if (!projects[projectKey]) {
        projects[projectKey] = { 
          hours: 0, 
          earnings: 0, 
          shifts: 0, 
          name: project?.name || 'Unknown',
          color: project?.color || '#8b5cf6'
        };
      }
      projects[projectKey].hours += hours;
      projects[projectKey].earnings += (regularHours * hourlyRate) + (otHours * overtimeRate);
      projects[projectKey].shifts += 1;
    });

    return Object.entries(projects)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);
  }, [snap.history, snap.projects, hourlyRate, overtimeRate, overtimeThreshold]);

  return (
    <div className="space-y-8">
      {/* Weekly Reports */}
      {weeklyData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-6">Weekly Summary (Last 52 Weeks)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Week</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Shifts</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Overtime</th>
                  {hourlyRate > 0 && (
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Earnings</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((week) => {
                  const date = new Date(week.week);
                  return (
                    <tr key={week.week} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-300">
                        Week of {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{week.shifts}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{hoursToText(week.hours)}</td>
                      <td className="py-3 px-4 text-right text-orange-400">{hoursToText(week.overtimeHours)}</td>
                      {hourlyRate > 0 && (
                        <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                          {formatCurrency(week.earnings, snap.prefs.currency)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Reports */}
      {monthlyData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-6">Monthly Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Shifts</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Hours</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Overtime</th>
                  {hourlyRate > 0 && (
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">Earnings</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(month => {
                  const date = new Date(month.month + '-01');
                  return (
                    <tr key={month.month} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{month.shifts}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{hoursToText(month.hours)}</td>
                      <td className="py-3 px-4 text-right text-orange-400">{hoursToText(month.overtimeHours)}</td>
                      {hourlyRate > 0 && (
                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                          {formatCurrency(month.earnings, snap.prefs.currency)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yearly Reports */}
      {yearlyData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-6">Yearly Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yearlyData.map(year => (
              <div key={year.year} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-2">Year {year.year}</div>
                <div className="text-2xl font-bold text-slate-200 mb-1">{hoursToText(year.hours)}</div>
                <div className="text-xs text-slate-500 mb-3">
                  {year.shifts} shifts • {hoursToText(year.overtimeHours)} OT
                </div>
                {hourlyRate > 0 && (
                  <div className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(year.earnings, snap.prefs.currency)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Reports */}
      {projectData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-6">Project Breakdown</h3>
          <div className="space-y-3">
            {projectData.map(project => (
              <div
                key={project.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-semibold text-slate-200">{project.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-200">{hoursToText(project.hours)}</div>
                    {hourlyRate > 0 && (
                      <div className="text-sm text-emerald-400">
                        {formatCurrency(project.earnings, snap.prefs.currency)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span>{project.shifts} shift{project.shifts !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(weeklyData.length === 0 && monthlyData.length === 0 && yearlyData.length === 0) && (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-400">No data available for advanced reports. Start tracking shifts to see reports!</p>
        </div>
      )}
    </div>
  );
}

