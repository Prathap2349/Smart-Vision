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
    neutral: 'bg-slate-100 text-slate-500 border-slate-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  }[variant];

  return (
    <div
      className={clsx(
        'p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-xs space-y-3',
        className
      )}
    >
      <div className={clsx('w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto text-lg shadow-xs', iconBg)}>
        {icon || <AlertCircle className="w-6 h-6" />}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
