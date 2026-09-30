import React from 'react';
import { clsx } from 'clsx';

export type StatusVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'slate'
  | 'indigo'
  | 'blue'
  | 'violet';

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusVariant;
  label?: string;
  children?: React.ReactNode;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  children,
  pulse = false,
  size = 'md',
  className,
}) => {
  const normalized = (status || label || (typeof children === 'string' ? children : '') || '').toUpperCase();
  
  // Format display text nicely into plain English
  let displayLabel = label || children || normalized.replace(/_/g, ' ');
  if (typeof displayLabel === 'string') {
    if (displayLabel.toUpperCase() === 'ONLINE') displayLabel = 'Online';
    else if (displayLabel.toUpperCase() === 'OFFLINE') displayLabel = 'Offline';
    else if (displayLabel.toUpperCase() === 'THREAT' || displayLabel.toUpperCase() === 'VERIFIED_THREAT') displayLabel = 'Security Alert';
    else if (displayLabel.toUpperCase() === 'SAFE' || displayLabel.toUpperCase() === 'SAFE_RESIDENT') displayLabel = 'Household Safe';
    else if (displayLabel.toUpperCase() === 'MONITORING') displayLabel = 'Monitoring';
    else if (displayLabel.toUpperCase() === 'UNKNOWN') displayLabel = 'Unrecognized Person';
    else if (displayLabel.toUpperCase() === 'KNOWN' || displayLabel.toUpperCase() === 'VERIFIED') displayLabel = 'Recognized';
    else if (displayLabel.toUpperCase() === 'PROTECTION ACTIVE') displayLabel = 'Protected';
  }

  let colorClasses = 'bg-slate-800/80 text-text-secondary border-white/10';
  let dotColor = 'bg-slate-400';

  if (
    variant === 'success' ||
    variant === 'emerald' ||
    ['ONLINE', 'KNOWN', 'SAFE', 'HEALTHY', 'VERIFIED', 'VERIFIED_RESIDENT', 'PASS', 'ACTIVE', 'PROTECTED', 'HOUSEHOLD SAFE'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-success/10 text-brand-success border-brand-success/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]';
    dotColor = 'bg-brand-success';
  } else if (
    variant === 'danger' ||
    variant === 'rose' ||
    ['THREAT', 'CRITICAL', 'FAILED', 'HIGH', 'ALARM', 'VERIFIED_THREAT', 'SECURITY ALERT'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-alert/15 text-rose-400 border-brand-alert/40 shadow-rose-glow';
    dotColor = 'bg-brand-alert';
  } else if (
    variant === 'warning' ||
    variant === 'amber' ||
    ['WARNING', 'MEDIUM', 'DEGRADED', 'RECONNECTING', 'LOW_QUALITY', 'ATTENTION'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-warning/15 text-amber-300 border-brand-warning/30';
    dotColor = 'bg-brand-warning';
  } else if (
    variant === 'cyan' ||
    ['PROCESSING', 'FACE MATCH', 'CONNECTING', 'DEVICE_TEST'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-cyan/15 text-cyan-300 border-brand-cyan/30 shadow-cyan-glow';
    dotColor = 'bg-brand-cyan';
  } else if (
    variant === 'info' ||
    variant === 'blue' ||
    ['MONITORING', 'CLEAR', 'INFO', 'LOW'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-blue/15 text-blue-300 border-brand-blue/30';
    dotColor = 'bg-brand-blue';
  } else if (
    variant === 'violet' ||
    ['AI', 'INTELLIGENCE', 'ARC FACE'].includes(normalized)
  ) {
    colorClasses = 'bg-brand-violet/15 text-violet-300 border-brand-violet/30';
    dotColor = 'bg-brand-violet';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide transition-colors',
        sizeClasses,
        colorClasses,
        className
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          dotColor,
          pulse && 'animate-ping'
        )}
      />
      {displayLabel}
    </span>
  );
};
