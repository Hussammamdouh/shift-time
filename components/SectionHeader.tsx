'use client';

import { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  gradient?: string; // e.g. 'from-violet-600 to-cyan-600'
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  className?: string;
  actions?: ReactNode;
};

export default function SectionHeader({
  title,
  subtitle,
  icon,
  gradient = 'from-violet-600 to-cyan-600',
  size = 'md',
  align = 'left',
  className = '',
  actions,
}: SectionHeaderProps) {
  const titleClass =
    size === 'lg'
      ? 'text-2xl lg:text-3xl font-bold'
      : size === 'sm'
      ? 'text-base font-semibold'
      : 'text-xl font-semibold';

  const containerAlign = align === 'center' ? 'justify-center text-center' : 'justify-between';

  return (
    <div className={`flex items-center ${containerAlign} ${className}`}>
      <div className="flex items-center space-x-3">
        {icon && (
          <div className={`w-8 h-8 ${size === 'lg' ? 'w-10 h-10' : ''} bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center`}>
            <div className="w-4 h-4 text-white">{icon}</div>
          </div>
        )}
        <div className={`${align === 'center' ? 'space-y-1' : ''}`}>
          <h3 className={`${titleClass} text-slate-200 ribbon`}>{title}</h3>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="ml-4 flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}


