'use client';

import { ReactNode } from 'react';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'pulse' | 'dots' | 'bars' | 'ring';
  text?: string;
  icon?: ReactNode;
  className?: string;
};

const sizeConfig = {
  sm: { size: 16, text: 'text-xs' },
  md: { size: 24, text: 'text-sm' },
  lg: { size: 32, text: 'text-base' },
  xl: { size: 48, text: 'text-lg' },
};

export default function LoadingSpinner({
  size = 'md',
  variant = 'default',
  text,
  icon,
  className = '',
}: LoadingSpinnerProps) {
  const { size: spinnerSize, text: textSize } = sizeConfig[size];

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-current rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        );

      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        );

      case 'bars':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1 bg-current animate-pulse"
                style={{
                  height: `${spinnerSize}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className="relative">
            <div
              className="border-2 border-current border-t-transparent rounded-full animate-spin"
              style={{
                width: `${spinnerSize}px`,
                height: `${spinnerSize}px`,
              }}
            />
            <div
              className="absolute inset-0 border-2 border-current border-r-transparent rounded-full animate-spin"
              style={{
                width: `${spinnerSize}px`,
                height: `${spinnerSize}px`,
                animationDirection: 'reverse',
                animationDuration: '1.5s',
              }}
            />
          </div>
        );

      default:
        return (
          <div
            className="border-2 border-current border-t-transparent rounded-full animate-spin"
            style={{
              width: `${spinnerSize}px`,
              height: `${spinnerSize}px`,
            }}
          />
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="text-current animate-pulse">
          {icon}
        </div>
      )}
      
      {/* Spinner */}
      <div className="text-violet-400">
        {renderSpinner()}
      </div>
      
      {/* Text */}
      {text && (
        <div className={`text-slate-400 font-medium ${textSize} animate-pulse`}>
          {text}
        </div>
      )}
    </div>
  );
}

// Specialized Loading Components
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-6 animate-in fade-in-scale duration-500">
        <div className="relative">
          <div className="w-24 h-24 mx-auto border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin animate-reverse animate-delay-300"></div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold gradient-text-animate">Loading Shift Tracker</h2>
          <p className="text-slate-400 text-lg">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function CardLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        <div className="h-8 bg-slate-700 rounded w-1/2"></div>
        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function TableLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-4 bg-slate-700 rounded w-1/6"></div>
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonLoader({ className = '', lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-700 rounded"
          style={{ width: `${80 - i * 10}%` }}
        ></div>
      ))}
    </div>
  );
}
