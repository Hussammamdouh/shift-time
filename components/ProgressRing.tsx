'use client';

import { useEffect, useState } from 'react';

type Props = {
  progress: number; // 0 to 1
  label: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  showPercentage?: boolean;
};

export default function ProgressRing({ 
  progress, 
  label, 
  sublabel, 
  size = 'lg',
  strokeWidth = 8,
  showPercentage = false
}: Props) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const sizeMap = {
    sm: { size: 120, fontSize: 'text-lg', subFontSize: 'text-sm' },
    md: { size: 160, fontSize: 'text-xl', subFontSize: 'text-sm' },
    lg: { size: 200, fontSize: 'text-2xl', subFontSize: 'text-base' },
    xl: { size: 280, fontSize: 'text-3xl', subFontSize: 'text-lg' },
  };

  const { size: ringSize, fontSize, subFontSize } = sizeMap[size];
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedProgress * circumference);

  // Enhanced color calculation based on progress
  const getProgressColor = (progress: number) => {
    if (progress >= 1) return 'stroke-emerald-500';
    if (progress >= 0.8) return 'stroke-emerald-400';
    if (progress >= 0.6) return 'stroke-blue-400';
    if (progress >= 0.4) return 'stroke-yellow-400';
    if (progress >= 0.2) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  const progressColor = getProgressColor(animatedProgress);

  // Enhanced glow effect based on progress
  const getGlowFilter = (progress: number) => {
    if (progress >= 1) return 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.6))';
    if (progress >= 0.8) return 'drop-shadow(0 0 18px rgba(16, 185, 129, 0.5))';
    if (progress >= 0.6) return 'drop-shadow(0 0 16px rgba(59, 130, 246, 0.5))';
    if (progress >= 0.4) return 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.5))';
    if (progress >= 0.2) return 'drop-shadow(0 0 12px rgba(251, 146, 60, 0.5))';
    return 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))';
  };

  const glowFilter = getGlowFilter(animatedProgress);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Enhanced Progress Ring */}
      <svg
        className="transform -rotate-90"
        width={ringSize}
        height={ringSize}
      >
        {/* Enhanced Background Circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-700/50"
        />
        
        {/* Enhanced Progress Circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${progressColor} transition-all duration-1000 ease-out`}
          strokeLinecap="round"
          style={{ filter: glowFilter }}
        />
        
        {/* Enhanced Glow Effect */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Enhanced Radial Gradient for Progress */}
          <radialGradient id="progressGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.4"/>
          </radialGradient>
        </defs>
        
        {/* Enhanced Animated Progress Circle with Gradient */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${progressColor} transition-all duration-1000 ease-out`}
          strokeLinecap="round"
          filter="url(#glow)"
        />
      </svg>

      {/* Enhanced Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={`font-bold text-white ${fontSize} leading-tight mb-2`}>
          {label}
        </div>
        
        {showPercentage && (
          <div className={`font-semibold text-slate-300 ${subFontSize} mb-2`}>
            {Math.round(progress * 100)}%
          </div>
        )}
        
        {sublabel && (
          <div className={`font-medium text-slate-400 ${subFontSize} max-w-[85%] leading-relaxed`}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Enhanced Progress Indicator Dots */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Enhanced Progress dots around the ring */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * (radius + strokeWidth / 2 + 12);
            const y = Math.sin(angle) * (radius + strokeWidth / 2 + 12);
            const dotProgress = i / 12;
            const isActive = animatedProgress >= dotProgress;
            
            return (
              <div
                key={i}
                className={`absolute w-3 h-3 rounded-full transition-all duration-700 transform ${
                  isActive 
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 scale-110' 
                    : 'bg-slate-600 scale-75'
                }`}
                style={{
                  transform: `translate(${x}px, ${y}px) scale(${isActive ? 1.1 : 0.75})`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Enhanced Animated Border Glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 animate-pulse"
        style={{
          background: `conic-gradient(from 0deg, ${progressColor.replace('stroke-', '')} 0deg, transparent ${animatedProgress * 360}deg, transparent 360deg)`,
          filter: glowFilter,
        }}
      />
      
      {/* Enhanced Progress Pulse Effect */}
      {animatedProgress > 0 && (
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{
            background: `conic-gradient(from 0deg, ${progressColor.replace('stroke-', '')} 0deg, transparent ${animatedProgress * 360}deg, transparent 360deg)`,
          }}
        />
      )}
      
      {/* Enhanced Success Animation for 100% */}
      {animatedProgress >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
