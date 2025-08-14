'use client';
import { useMemo } from 'react';

type Props = {
  progress: number; // 0 to 1
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
};

export default function ProgressRing({ 
  progress, 
  label, 
  sublabel, 
  size = 200, 
  strokeWidth = 12 
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress * circumference);

  const progressColor = useMemo(() => {
    if (progress >= 1) return '#10b981'; // Green when complete
    if (progress >= 0.9) return '#f59e0b'; // Yellow when near
    if (progress >= 0.7) return '#3b82f6'; // Blue when good
    return '#ef4444'; // Red when low
  }, [progress]);

  const glowColor = useMemo(() => {
    if (progress >= 1) return 'rgba(16, 185, 129, 0.3)'; // Green glow
    if (progress >= 0.9) return 'rgba(245, 158, 11, 0.3)'; // Yellow glow
    if (progress >= 0.7) return 'rgba(59, 130, 246, 0.3)'; // Blue glow
    return 'rgba(239, 68, 68, 0.3)'; // Red glow
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Background circle */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-700"
            opacity={0.3}
          />
        </svg>

        {/* Progress circle */}
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="absolute inset-0 transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 20px ${glowColor})`
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold font-mono text-gray-100 mb-2">
              {label}
            </div>
            {sublabel && (
              <div className="text-sm font-medium text-gray-400 max-w-32">
                {sublabel}
              </div>
            )}
          </div>
        </div>

        {/* Progress percentage indicator */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
            <span className="text-xs font-medium text-gray-300">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
