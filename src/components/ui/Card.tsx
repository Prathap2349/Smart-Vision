import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'highlight' | 'critical' | 'success';
  glow?: 'cyan' | 'rose' | 'emerald' | 'blue' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  glow = 'none',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200/80 shadow-sm',
    subtle: 'bg-slate-50/80 border-slate-200/60',
    highlight: 'bg-blue-50/50 border-blue-200 shadow-sm',
    critical: 'bg-rose-50/50 border-rose-200 shadow-sm',
    success: 'bg-emerald-50/50 border-emerald-200 shadow-sm',
  };

  const glowStyles = {
    cyan: 'border-cyan-300 shadow-md shadow-cyan-500/10',
    blue: 'border-blue-300 shadow-md shadow-blue-500/10',
    rose: 'border-rose-300 shadow-md shadow-rose-500/10',
    emerald: 'border-emerald-300 shadow-md shadow-emerald-500/10',
    none: '',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-5 transition-all duration-200 text-slate-800',
        variantStyles[variant],
        glowStyles[glow],
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.995]',
        className
      )}
    >
      {children}
    </div>
  );
};
