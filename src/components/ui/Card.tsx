import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'highlight' | 'critical' | 'success';
  glow?: 'cyan' | 'rose' | 'emerald' | 'blue' | 'violet' | 'none';
  interactive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  glow = 'none',
  interactive = false,
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-aurora-surface/90 border-white/10 shadow-card-glass',
    elevated: 'bg-aurora-elevated/95 border-white/15 shadow-xl shadow-black/40',
    glass: 'glass-panel',
    highlight: 'bg-aurora-surface/95 border-brand-cyan/30 shadow-cyan-glow',
    critical: 'bg-aurora-surface/95 border-brand-alert/40 shadow-rose-glow',
    success: 'bg-aurora-surface/95 border-brand-success/30 shadow-[0_0_20px_rgba(52,211,153,0.15)]',
  };

  const glowStyles = {
    cyan: 'border-brand-cyan/40 shadow-cyan-glow',
    blue: 'border-brand-blue/40 shadow-blue-glow',
    violet: 'border-brand-violet/40 shadow-violet-glow',
    rose: 'border-brand-alert/40 shadow-rose-glow',
    emerald: 'border-brand-success/40 shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    none: '',
  };

  const isClickable = Boolean(onClick || interactive);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-5 transition-all duration-200 text-text-primary backdrop-blur-md',
        variantStyles[variant],
        glowStyles[glow],
        isClickable && 'cursor-pointer hover:border-brand-blue/40 hover:bg-aurora-elevated hover:shadow-aurora-glow hover:-translate-y-0.5 active:scale-[0.995]',
        className
      )}
    >
      {children}
    </div>
  );
};

export const GlassCard: React.FC<CardProps> = (props) => {
  return <Card {...props} variant="glass" />;
};
