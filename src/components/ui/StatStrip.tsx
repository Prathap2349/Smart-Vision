import React from 'react';
import { clsx } from 'clsx';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'blue' | 'amber' | 'neutral' | 'purple' | 'cyan';
  onClick?: () => void;
}

interface StatStripProps {
  items: StatItem[];
  className?: string;
}

export const StatStrip: React.FC<StatStripProps> = ({ items, className }) => {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
        className
      )}
    >
      {items.map(item => {
        const bgBadgeColor =
          item.variant === 'emerald'
            ? 'bg-brand-success/15 text-brand-success border-brand-success/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
            : item.variant === 'rose'
            ? 'bg-brand-alert/15 text-rose-400 border-brand-alert/30 shadow-rose-glow'
            : item.variant === 'cyan'
            ? 'bg-brand-cyan/15 text-cyan-300 border-brand-cyan/30 shadow-cyan-glow'
            : item.variant === 'blue'
            ? 'bg-brand-blue/15 text-blue-300 border-brand-blue/30 shadow-blue-glow'
            : item.variant === 'amber'
            ? 'bg-brand-warning/15 text-amber-300 border-brand-warning/30'
            : item.variant === 'purple'
            ? 'bg-brand-violet/15 text-violet-300 border-brand-violet/30 shadow-violet-glow'
            : 'bg-slate-800/80 text-text-secondary border-white/10';

        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className={clsx(
              'p-5 rounded-2xl bg-aurora-surface/80 border border-white/10 shadow-card-glass backdrop-blur-md hover:border-brand-blue/30 hover:bg-aurora-elevated hover:shadow-aurora-glow hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4',
              item.onClick && 'cursor-pointer'
            )}
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-text-muted">{item.label}</p>
              <h3 className="text-2xl font-bold text-text-primary tracking-tight truncate">
                {item.value === '' || item.value === undefined || item.value === null ? '—' : item.value}
              </h3>
              {item.subtext && (
                <p className="text-xs text-text-secondary truncate">{item.subtext}</p>
              )}
            </div>

            <div
              className={clsx(
                'p-3 rounded-xl border shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
                bgBadgeColor
              )}
            >
              {item.icon}
            </div>
          </div>
        );
      })}
    </div>
  );
};
