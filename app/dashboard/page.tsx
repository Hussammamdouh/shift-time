'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { getCompanyDashboardData, formatHours, formatCurrency } from '@/lib/dashboard';
import type { UserDashboardData } from '@/lib/dashboard';
import { PageLoader } from '@/components/LoadingSpinner';

function DashboardContent() {
  const { company, isAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState<UserDashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const loadDashboardData = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getCompanyDashboardData(company.id);
      setDashboardData(data);
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      WORKING: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Working' },
      ON_BREAK: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'On Break' },
      IDLE: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', label: 'Idle' },
      UNKNOWN: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Unknown' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.UNKNOWN;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.border} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WORKING':
        return (
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
        );
      case 'ON_BREAK':
        return (
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        );
      case 'IDLE':
        return (
          <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
        );
    }
  };

  // Calculate totals
  const totalEmployees = dashboardData.length;
  const workingCount = dashboardData.filter(u => u.currentStatus === 'WORKING').length;
  const totalEarnings = isAdmin ? dashboardData.reduce((sum, u) => sum + u.totalEarnings, 0) : 0;
  const totalHours = dashboardData.reduce((sum, u) => sum + u.totalHours, 0);

  if (loading) {
    return <PageLoader text="Loading company dashboard..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Clean Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow pulse-glow">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text-animate ribbon truncate">
                  Company Dashboard
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-slate-400 hidden sm:block truncate">
                  Monitor all employees and track productivity
                </p>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={loadDashboardData}
                className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-500/30 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 font-medium transition-colors duration-200 flex items-center"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline ml-2">Refresh</span>
              </button>
              <Link
                href="/"
                className="p-2 sm:px-3 sm:py-2 rounded-lg border border-violet-500/30 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline ml-2">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-8`}>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Employees</p>
                <p className="text-3xl font-bold text-slate-200">{totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Currently Working</p>
                <p className="text-3xl font-bold text-emerald-400">{workingCount}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-cyan-400">{formatHours(totalHours)}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalEarnings)}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Employees Table */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-200">Employees</h2>
              <p className="text-sm text-slate-400 mt-1">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            </div>
            {isAdmin && (
              <a href="/admin/employees" className="btn btn-primary btn-sm">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Employee
              </a>
            )}
          </div>

          {dashboardData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-slate-400">No employees found in your company.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">Employee</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">Shifts</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">Hours</th>
                      {isAdmin && (
                        <>
                          <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">Hourly Rate</th>
                          <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">Earnings</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.map((data) => (
                      <tr
                        key={data.profile.uid}
                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(data.profile.displayName || data.profile.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">
                                {data.profile.displayName || 'Unknown User'}
                              </p>
                              <p className="text-xs text-slate-400">{data.profile.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(data.currentStatus)}
                            {getStatusBadge(data.currentStatus)}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-slate-200 font-mono">{data.totalShifts}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-slate-200 font-mono">{formatHours(data.totalHours)}</span>
                        </td>
                        {isAdmin && (
                          <>
                            <td className="py-4 px-4 text-right">
                              <span className="text-slate-300">
                                {data.snapshot?.prefs.hourlyRate 
                                  ? formatCurrency(data.snapshot.prefs.hourlyRate, data.snapshot.prefs.currency || 'EGP') + '/hr'
                                  : '—'
                                }
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-emerald-400 font-semibold">
                                {formatCurrency(data.totalEarnings, data.snapshot?.prefs.currency || 'EGP')}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {dashboardData.map((data) => (
                  <div key={data.profile.uid} className="card hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(data.profile.displayName || data.profile.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-200 truncate">
                            {data.profile.displayName || 'Unknown User'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{data.profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(data.currentStatus)}
                        {getStatusBadge(data.currentStatus)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Shifts</p>
                        <p className="text-lg font-semibold text-slate-200">{data.totalShifts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Hours</p>
                        <p className="text-lg font-semibold text-slate-200">{formatHours(data.totalHours)}</p>
                      </div>
                      {isAdmin && (
                        <>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Hourly Rate</p>
                            <p className="text-sm font-medium text-slate-300">
                              {data.snapshot?.prefs.hourlyRate 
                                ? formatCurrency(data.snapshot.prefs.hourlyRate, data.snapshot.prefs.currency || 'EGP') + '/hr'
                                : '—'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Earnings</p>
                            <p className="text-lg font-semibold text-emerald-400">
                              {formatCurrency(data.totalEarnings, data.snapshot?.prefs.currency || 'EGP')}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

