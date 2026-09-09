import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'rose' | 'emerald' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, glow = 'none', onClick }) => {
  const glowClasses = {
    cyan: 'border-cyan-500/30 shadow-cyan-glow',
    rose: 'border-rose-500/40 shadow-rose-glow',
    emerald: 'border-emerald-500/30 shadow-emerald-glow',
    none: 'border-slate-800/80',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-[#0f172a]/90 backdrop-blur-md rounded-xl border p-5 transition-all duration-200',
        glowClasses[glow],
        onClick && 'cursor-pointer hover:border-cyan-500/50 hover:bg-[#152038]/90',
        className
      )}
    >
      {children}
    </div>
  );
};
