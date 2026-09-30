import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'highlight' | 'critical' | 'success';
  glow?: 'cyan' | 'rose' | 'emerald' | 'none';
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
    default: 'bg-[#0d1424] border-slate-800/80',
    subtle: 'bg-[#0a0f1d] border-slate-800/60',
    highlight: 'bg-[#0f172a] border-blue-500/30 shadow-lg shadow-blue-500/5',
    critical: 'bg-[#150d18] border-rose-500/40 shadow-lg shadow-rose-500/5',
    success: 'bg-[#0c1918] border-emerald-500/30 shadow-lg shadow-emerald-500/5',
  };

  const glowStyles = {
    cyan: 'shadow-[0_0_20px_rgba(6,182,212,0.12)] border-cyan-500/40',
    rose: 'shadow-[0_0_20px_rgba(244,63,94,0.15)] border-rose-500/50',
    emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.12)] border-emerald-500/40',
    none: '',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl border p-5 transition-all duration-200',
        variantStyles[variant],
        glowStyles[glow],
        onClick && 'cursor-pointer hover:border-slate-700 hover:bg-[#111a30]',
        className
      )}
    >
      {children}
    </div>
  );
};
