import React from 'react';
import { clsx } from 'clsx';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  badge,
  className,
}) => {
  return (
    <div className={clsx('flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-brand-blue/15 text-brand-cyan flex items-center justify-center shrink-0 border border-brand-blue/30 shadow-cyan-glow">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-text-primary tracking-tight">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
