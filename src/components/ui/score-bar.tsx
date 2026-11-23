import React from 'react';

export interface ScoreBarProps {
  score: number; // 0 to 1
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function ScoreBar({ score, label, showPercent = true, className = '' }: ScoreBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(score * 100)));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs font-mono">
          {label && <span className="text-[#A1A1AA] uppercase tracking-wider text-[10px]">{label}</span>}
          {showPercent && <span className="font-bold text-[#FFD60A]">{percent}%</span>}
        </div>
      )}
      <div
        className="w-full h-2 bg-[#17171A] rounded-full overflow-hidden border border-[#26262B]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Score'}
      >
        <div
          className="h-full bg-gradient-to-r from-[#FFD60A]/80 to-[#FFD60A] rounded-full animate-score-bar"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
