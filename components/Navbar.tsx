'use client';

import { useState } from 'react';

type Tab = 'watch' | 'manual' | 'report' | 'sync' | 'settings';

type Props = {
  tab: Tab;
  setTab: (tab: Tab) => void;
};

const tabConfig = {
  watch: {
    label: 'Stopwatch',
    description: 'Track active shifts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-violet-600 to-cyan-600',
    bgColor: 'from-violet-600/20 to-cyan-600/20',
    borderColor: 'border-violet-500/30',
  },
  manual: {
    label: 'Manual Entry',
    description: 'Add past shifts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-slate-600 to-slate-700',
    bgColor: 'from-slate-600/20 to-slate-700/20',
    borderColor: 'border-slate-500/30',
  },
  report: {
    label: 'Reports',
    description: 'View history & analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-violet-600 to-cyan-600',
    bgColor: 'from-violet-600/20 to-cyan-600/20',
    borderColor: 'border-violet-500/30',
  },
  sync: {
    label: 'Sync',
    description: 'Share across devices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: 'from-blue-600 to-indigo-600',
    bgColor: 'from-blue-600/20 to-indigo-600/20',
    borderColor: 'border-blue-500/30',
  },
  settings: {
    label: 'Settings',
    description: 'Configure preferences',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-slate-600 to-slate-700',
    bgColor: 'from-slate-600/20 to-slate-700/20',
    borderColor: 'border-slate-500/30',
  },
};

export default function Navbar({ tab, setTab }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block space-y-3">
        <div className="text-center pb-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-200">Navigation</h2>
          <p className="text-sm text-slate-400">Quick access to features</p>
        </div>
        
        <div className="space-y-2">
          {(Object.keys(tabConfig) as Tab[]).map((tabKey) => {
            const config = tabConfig[tabKey];
            const isActive = tab === tabKey;
            
            return (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`w-full group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 transform hover:scale-105 ${
                  isActive 
                    ? `bg-gradient-to-r ${config.bgColor} border ${config.borderColor} shadow-lg` 
                    : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-600/50'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-10`} />
                )}
                
                <div className="relative flex items-center space-x-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-r ${config.color} text-white shadow-lg` 
                      : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
                  }`}>
                    {config.icon}
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {config.label}
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      isActive ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {config.description}
                    </div>
                  </div>
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Navigation Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="font-medium text-slate-200">Navigation</span>
          </div>
          <svg 
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {(Object.keys(tabConfig) as Tab[]).map((tabKey) => {
              const config = tabConfig[tabKey];
              const isActive = tab === tabKey;
              
              return (
                <button
                  key={tabKey}
                  onClick={() => {
                    setTab(tabKey);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? `bg-gradient-to-r ${config.bgColor} border ${config.borderColor}` 
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive 
                      ? `bg-gradient-to-r ${config.color} text-white` 
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${
                      isActive ? 'text-white' : 'text-slate-200'
                    }`}>
                      {config.label}
                    </div>
                    <div className={`text-sm ${
                      isActive ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {config.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
