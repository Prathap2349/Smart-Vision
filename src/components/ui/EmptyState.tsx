import React from 'react';
import { clsx } from 'clsx';
import { Shield, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'neutral' | 'amber' | 'blue';
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
    neutral: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-950/40 text-blue-400 border-blue-500/30',
  }[variant];

  return (
    <div
      className={clsx(
        'p-8 text-center rounded-xl border border-dashed border-slate-800 bg-[#090e1a]/60 space-y-3',
        className
      )}
    >
      <div className={clsx('w-12 h-12 rounded-xl border flex items-center justify-center mx-auto text-lg shadow-inner', iconBg)}>
        {icon || <AlertCircle className="w-6 h-6" />}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
