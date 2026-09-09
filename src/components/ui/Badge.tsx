import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'slate' | 'purple';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  pulse = false,
  className,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/50',
    purple: 'bg-purple-950/80 text-purple-400 border-purple-500/30',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider',
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              variant === 'rose' && 'bg-rose-400',
              variant === 'emerald' && 'bg-emerald-400',
              variant === 'cyan' && 'bg-cyan-400',
              variant === 'amber' && 'bg-amber-400',
              variant === 'slate' && 'bg-slate-400'
            )}
          />
          <span
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              variant === 'rose' && 'bg-rose-500',
              variant === 'emerald' && 'bg-emerald-500',
              variant === 'cyan' && 'bg-cyan-500',
              variant === 'amber' && 'bg-amber-500',
              variant === 'slate' && 'bg-slate-500'
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
};
