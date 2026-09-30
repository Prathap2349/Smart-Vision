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
    <div className={clsx('flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <div className="text-blue-400 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-400 font-medium truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
