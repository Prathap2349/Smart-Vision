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
  
  // Format display text nicely
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

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    variant === 'success' ||
    variant === 'emerald' ||
    ['ONLINE', 'KNOWN', 'SAFE', 'HEALTHY', 'VERIFIED', 'VERIFIED_RESIDENT', 'PASS', 'ACTIVE', 'PROTECTED', 'HOUSEHOLD SAFE'].includes(normalized)
  ) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    dotColor = 'bg-emerald-500';
  } else if (
    variant === 'danger' ||
    variant === 'rose' ||
    ['THREAT', 'CRITICAL', 'UNKNOWN', 'ALERT FIRED', 'ALERT', 'FAIL', 'DANGER', 'SECURITY ALERT', 'VERIFIED_THREAT'].includes(normalized)
  ) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotColor = 'bg-rose-500';
  } else if (
    variant === 'warning' ||
    variant === 'amber' ||
    ['WARNING', 'RE_ENROLLMENT_REQUIRED', 'RE-ENROLLMENT REQUIRED', 'PENDING', 'DEGRADED', 'ATTENTION'].includes(normalized)
  ) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80';
    dotColor = 'bg-amber-500';
  } else if (
    variant === 'info' ||
    variant === 'cyan' ||
    variant === 'blue' ||
    variant === 'indigo' ||
    ['MONITORING', 'RTSP LIVE', 'EVALUATING', 'CONNECTED', 'INFO', 'LIVE'].includes(normalized)
  ) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
    dotColor = 'bg-blue-500';
  } else if (
    variant === 'neutral' ||
    variant === 'slate' ||
    ['OFFLINE', 'DISCONNECTED', 'IDLE', 'STANDBY', 'NOT_CONNECTED'].includes(normalized)
  ) {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const isPulsing = pulse || ['THREAT', 'CRITICAL', 'ALERT FIRED', 'SECURITY ALERT', 'VERIFIED_THREAT'].includes(normalized);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium border select-none transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
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
