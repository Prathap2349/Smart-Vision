import React from 'react';
import { clsx } from 'clsx';
import { Shield, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'neutral' | 'amber' | 'blue' | 'cyan' | 'rose';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'neutral',
  className,
}) => {
  const iconBg = {
    neutral: 'bg-slate-800/80 text-text-secondary border-white/10',
    amber: 'bg-brand-warning/15 text-amber-300 border-brand-warning/30',
    blue: 'bg-brand-blue/15 text-blue-300 border-brand-blue/30',
    cyan: 'bg-brand-cyan/15 text-cyan-300 border-brand-cyan/30 shadow-cyan-glow',
    rose: 'bg-brand-alert/15 text-rose-400 border-brand-alert/30 shadow-rose-glow',
  }[variant];

  return (
    <div
      className={clsx(
        'p-8 text-center rounded-2xl border border-white/10 bg-aurora-surface/60 backdrop-blur-md shadow-card-glass space-y-3.5',
        className
      )}
    >
      <div className={clsx('w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto text-lg shadow-sm', iconBg)}>
        {icon || <AlertCircle className="w-6 h-6" />}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed font-sans">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
