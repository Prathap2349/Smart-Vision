import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'cyan' | 'violet' | 'outline' | 'emerald' | 'rose' | 'amber' | 'slate' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pulse = false,
  className,
}) => {
  const variantStyles = {
    default: 'bg-slate-800/80 text-text-secondary border-white/10',
    success: 'bg-brand-success/15 text-brand-success border-brand-success/30',
    danger: 'bg-brand-alert/15 text-rose-400 border-brand-alert/30',
    warning: 'bg-brand-warning/15 text-amber-300 border-brand-warning/30',
    info: 'bg-brand-blue/15 text-blue-300 border-brand-blue/30',
    cyan: 'bg-brand-cyan/15 text-cyan-300 border-brand-cyan/30 shadow-cyan-glow',
    violet: 'bg-brand-violet/15 text-violet-300 border-brand-violet/30',
    outline: 'border-white/15 text-text-muted bg-transparent',
    emerald: 'bg-brand-success/15 text-emerald-300 border-brand-success/30',
    rose: 'bg-brand-alert/15 text-rose-300 border-brand-alert/30',
    amber: 'bg-brand-warning/15 text-amber-300 border-brand-warning/30',
    slate: 'bg-slate-800/80 text-text-secondary border-white/10',
    blue: 'bg-brand-blue/15 text-blue-300 border-brand-blue/30',
    purple: 'bg-brand-violet/15 text-violet-300 border-brand-violet/30',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-medium tracking-wide',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {pulse && <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  );
};
