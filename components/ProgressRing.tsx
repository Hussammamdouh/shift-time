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

  // Calculate colors based on progress
  const getProgressColor = (progress: number) => {
    if (progress >= 1) return 'stroke-emerald-500';
    if (progress >= 0.8) return 'stroke-emerald-400';
    if (progress >= 0.6) return 'stroke-blue-400';
    if (progress >= 0.4) return 'stroke-yellow-400';
    if (progress >= 0.2) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  const progressColor = getProgressColor(animatedProgress);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Progress Ring */}
      <svg
        className="transform -rotate-90"
        width={ringSize}
        height={ringSize}
      >
        {/* Background Circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-700/50"
        />
        
        {/* Progress Circle */}
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${progressColor} transition-all duration-1000 ease-out drop-shadow-lg`}
          strokeLinecap="round"
        />
        
        {/* Glow Effect */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated Progress Circle with Glow */}
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
          filter="url(#glow)"
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={`font-bold text-white ${fontSize} leading-tight`}>
          {label}
        </div>
        
        {showPercentage && (
          <div className={`font-semibold text-slate-300 ${subFontSize} mt-1`}>
            {Math.round(progress * 100)}%
          </div>
        )}
        
        {sublabel && (
          <div className={`font-medium text-slate-400 ${subFontSize} mt-2 max-w-[80%] leading-relaxed`}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Progress Indicator Dots */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Progress dots around the ring */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * (radius + strokeWidth / 2 + 10);
            const y = Math.sin(angle) * (radius + strokeWidth / 2 + 10);
            const dotProgress = i / 12;
            const isActive = animatedProgress >= dotProgress;
            
            return (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full transition-all duration-500 ${
                  isActive 
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                    : 'bg-slate-600'
                }`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Animated Border Glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 animate-pulse"
        style={{
          background: `conic-gradient(from 0deg, ${progressColor.replace('stroke-', '')} 0deg, transparent ${animatedProgress * 360}deg, transparent 360deg)`,
        }}
      />
    </div>
  );
}
