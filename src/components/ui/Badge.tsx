import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate' | 'purple';
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
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
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
              (variant === 'cyan' || variant === 'blue') && 'bg-blue-400',
              variant === 'amber' && 'bg-amber-400',
              variant === 'slate' && 'bg-slate-400'
            )}
          />
          <span
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              variant === 'rose' && 'bg-rose-500',
              variant === 'emerald' && 'bg-emerald-500',
              (variant === 'cyan' || variant === 'blue') && 'bg-blue-500',
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
