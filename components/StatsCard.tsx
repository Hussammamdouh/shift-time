'use client';

import { ReactNode } from 'react';

type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  onClick?: () => void;
  className?: string;
};

const colorConfig = {
  primary: {
    bg: 'from-violet-600/20 to-cyan-600/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    icon: 'from-violet-600 to-cyan-600',
    hover: 'hover:from-violet-600/30 hover:to-cyan-600/30',
  },
  success: {
    bg: 'from-emerald-600/20 to-green-600/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: 'from-emerald-600 to-green-600',
    hover: 'hover:from-emerald-600/30 hover:to-green-600/30',
  },
  warning: {
    bg: 'from-yellow-600/20 to-orange-600/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    icon: 'from-yellow-600 to-orange-600',
    hover: 'hover:from-yellow-600/30 hover:to-orange-600/30',
  },
  danger: {
    bg: 'from-red-600/20 to-pink-600/20',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'from-red-600 to-pink-600',
    hover: 'hover:from-red-600/30 hover:to-pink-600/30',
  },
  info: {
    bg: 'from-blue-600/20 to-indigo-600/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'from-blue-600 to-indigo-600',
    hover: 'hover:from-blue-600/30 hover:to-indigo-600/30',
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  onClick,
  className = '',
}: StatsCardProps) {
  const config = colorConfig[color];
  const isInteractive = !!onClick;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-500
        ${config.bg} ${config.border}
        ${isInteractive ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${config.icon} flex items-center justify-center shadow-lg`}>
                <div className="w-5 h-5 text-white">
                  {icon}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-slate-400">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          
          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <svg 
                className={`w-3 h-3 ${trend.isPositive ? 'rotate-0' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div className={`text-3xl font-bold ${config.text}`}>
            {value}
          </div>
          {trend && (
            <div className="text-xs text-slate-500">
              {trend.label}
            </div>
          )}
        </div>

        {/* Hover Effect */}
        {isInteractive && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}
      </div>

      {/* Animated Border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}

// Specialized Stats Card Variants
export function MetricCard({ title, value, subtitle, icon, color, trend, onClick }: StatsCardProps) {
  return (
    <StatsCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      color={color}
      trend={trend}
      onClick={onClick}
      className="text-center"
    />
  );
}

export function CompactCard({ title, value, subtitle, icon, color, trend, onClick }: StatsCardProps) {
  return (
    <StatsCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      color={color}
      trend={trend}
      onClick={onClick}
      className="p-4"
    />
  );
}

export function LargeCard({ title, value, subtitle, icon, color, trend, onClick }: StatsCardProps) {
  return (
    <StatsCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      color={color}
      trend={trend}
      onClick={onClick}
      className="p-8"
    />
  );
}
