import React from 'react';

interface AIStatusOrbProps {
  status?: 'ACTIVE' | 'MONITORING' | 'ALERT' | 'OFFLINE' | 'WARNING';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

export const AIStatusOrb: React.FC<AIStatusOrbProps> = ({
  status = 'ACTIVE',
  size = 'md',
  showLabel = false,
  label,
}) => {
  const sizeMap = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
  };

  const orbColorMap = {
    ACTIVE: 'bg-gradient-to-tr from-brand-cyan to-brand-blue animate-orb-breathe shadow-cyan-glow',
    MONITORING: 'bg-gradient-to-tr from-brand-blue to-brand-violet animate-orb-breathe shadow-violet-glow',
    ALERT: 'bg-gradient-to-tr from-brand-alert to-rose-600 animate-orb-alert shadow-rose-glow',
    WARNING: 'bg-brand-warning shadow-[0_0_15px_rgba(251,191,36,0.5)]',
    OFFLINE: 'bg-slate-600 shadow-none',
  };

  const defaultLabels = {
    ACTIVE: 'Protection active',
    MONITORING: 'AI Monitoring',
    ALERT: 'Attention needed',
    WARNING: 'Camera offline',
    OFFLINE: 'AI Paused',
  };

  const displayLabel = label || defaultLabels[status];

  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="relative flex items-center justify-center">
        {/* Core glowing orb */}
        <span
          className={`inline-block rounded-full transition-all duration-300 ${sizeMap[size]} ${orbColorMap[status]}`}
          aria-hidden="true"
        />
        {/* Subtle outer halo on active/alert */}
        {(status === 'ACTIVE' || status === 'MONITORING') && (
          <span className="absolute -inset-1 rounded-full bg-brand-cyan/20 animate-ping opacity-25 pointer-events-none" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-text-primary tracking-wide">
          {displayLabel}
        </span>
      )}
    </div>
  );
};
