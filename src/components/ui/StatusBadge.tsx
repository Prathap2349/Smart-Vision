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
  | 'blue';

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
  const displayLabel = label || children || normalized.replace(/_/g, ' ');

  let colorClasses = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let dotColor = 'bg-slate-400';

  if (
    variant === 'success' ||
    variant === 'emerald' ||
    ['ONLINE', 'KNOWN', 'SAFE', 'HEALTHY', 'VERIFIED', 'VERIFIED_RESIDENT', 'PASS'].includes(normalized)
  ) {
    colorClasses = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
  } else if (
    variant === 'danger' ||
    variant === 'rose' ||
    ['THREAT', 'CRITICAL', 'UNKNOWN', 'ALERT FIRED', 'ALERT', 'FAIL', 'DANGER'].includes(normalized)
  ) {
    colorClasses = 'bg-rose-950/70 text-rose-300 border-rose-500/40';
    dotColor = 'bg-rose-400';
  } else if (
    variant === 'warning' ||
    variant === 'amber' ||
    ['WARNING', 'RE_ENROLLMENT_REQUIRED', 'RE-ENROLLMENT REQUIRED', 'PENDING', 'DEGRADED'].includes(normalized)
  ) {
    colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
    dotColor = 'bg-amber-400';
  } else if (
    variant === 'info' ||
    variant === 'cyan' ||
    variant === 'blue' ||
    variant === 'indigo' ||
    ['MONITORING', 'ACTIVE', 'RTSP LIVE', 'EVALUATING', 'CONNECTED', 'INFO'].includes(normalized)
  ) {
    colorClasses = 'bg-blue-950/70 text-blue-300 border-blue-500/30';
    dotColor = 'bg-blue-400';
  } else if (
    variant === 'neutral' ||
    variant === 'slate' ||
    ['OFFLINE', 'DISCONNECTED', 'IDLE', 'STANDBY', 'NOT_CONNECTED'].includes(normalized)
  ) {
    colorClasses = 'bg-slate-900 text-slate-400 border-slate-800';
    dotColor = 'bg-slate-500';
  }

  const isPulsing = pulse || ['THREAT', 'CRITICAL', 'ALERT FIRED'].includes(normalized);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-mono font-bold tracking-wider border uppercase select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        colorClasses,
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {isPulsing && (
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColor
            )}
          />
        )}
        <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', dotColor)} />
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};
