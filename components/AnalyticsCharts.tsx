'use client';

import { useMemo } from 'react';
import type { HistoryRec } from '../lib/types';
import { hoursToText } from '../lib/timeUtils';

interface AnalyticsChartsProps {
  shifts: HistoryRec[];
  hourlyRate?: number;
}

export default function AnalyticsCharts({ shifts, hourlyRate = 0 }: AnalyticsChartsProps) {
  // Group shifts by week
  const weeklyData = useMemo(() => {
    const weeks: { [key: string]: { hours: number; earnings: number; count: number } } = {};
    
    shifts.forEach(shift => {
      const date = new Date(shift.startMs);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const hours = shift.netMs / 3600000;
      if (!weeks[weekKey]) {
        weeks[weekKey] = { hours: 0, earnings: 0, count: 0 };
      }
      weeks[weekKey].hours += hours;
      weeks[weekKey].earnings += hours * hourlyRate;
      weeks[weekKey].count += 1;
    });

    return Object.entries(weeks)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12); // Last 12 weeks
  }, [shifts, hourlyRate]);

  // Group shifts by month
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { hours: number; earnings: number; count: number } } = {};
    
    shifts.forEach(shift => {
      const date = new Date(shift.startMs);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const hours = shift.netMs / 3600000;
      if (!months[monthKey]) {
        months[monthKey] = { hours: 0, earnings: 0, count: 0 };
      }
      months[monthKey].hours += hours;
      months[monthKey].earnings += hours * hourlyRate;
      months[monthKey].count += 1;
    });

    return Object.entries(months)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12); // Last 12 months
  }, [shifts, hourlyRate]);

  // Tag distribution
  const tagDistribution = useMemo(() => {
    const tags: { [key: string]: number } = {};
    
    shifts.forEach(shift => {
      (shift.tags || []).forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    });

    return Object.entries(tags)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tags
  }, [shifts]);

  const maxWeeklyHours = Math.max(...weeklyData.map(d => d.hours), 1);
  const maxMonthlyHours = Math.max(...monthlyData.map(d => d.hours), 1);
  const maxTagCount = Math.max(...tagDistribution.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Weekly Trends */}
      {weeklyData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-4">Weekly Hours Trend (Last 12 Weeks)</h3>
          <div className="space-y-3">
            {weeklyData.map((week, index) => {
              const date = new Date(week.date);
              const weekLabel = `Week ${date.getDate()}/${date.getMonth() + 1}`;
              const percentage = (week.hours / maxWeeklyHours) * 100;
              
              return (
                <div key={week.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{weekLabel}</span>
                    <span className="text-slate-400 font-medium">
                      {hoursToText(week.hours)} • {week.count} shifts
                    </span>
                  </div>
                  <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-200">
                      {week.hours.toFixed(1)}h
                    </div>
                  </div>
                  {hourlyRate > 0 && (
                    <div className="text-xs text-emerald-400 text-right">
                      {week.earnings.toFixed(2)} {hourlyRate > 0 ? 'EGP' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      {monthlyData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-4">Monthly Hours Trend</h3>
          <div className="space-y-3">
            {monthlyData.map(month => {
              const date = new Date(month.date + '-01');
              const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const percentage = (month.hours / maxMonthlyHours) * 100;
              
              return (
                <div key={month.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{monthLabel}</span>
                    <span className="text-slate-400 font-medium">
                      {hoursToText(month.hours)} • {month.count} shifts
                    </span>
                  </div>
                  <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-200">
                      {hoursToText(month.hours)}
                    </div>
                  </div>
                  {hourlyRate > 0 && (
                    <div className="text-xs text-emerald-400 text-right">
                      {month.earnings.toFixed(2)} EGP
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tag Distribution */}
      {tagDistribution.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-slate-200 mb-4">Tag Distribution</h3>
          <div className="space-y-3">
            {tagDistribution.map(({ tag, count }) => {
              const percentage = (count / maxTagCount) * 100;
              
              return (
                <div key={tag} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{tag}</span>
                    <span className="text-slate-400 font-medium">{count} shifts</span>
                  </div>
                  <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {weeklyData.length === 0 && monthlyData.length === 0 && tagDistribution.length === 0 && (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-400">No data available for analytics. Start tracking shifts to see trends!</p>
        </div>
      )}
    </div>
  );
}

