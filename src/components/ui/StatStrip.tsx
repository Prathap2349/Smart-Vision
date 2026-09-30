import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, Camera, Users, Bell, CheckCircle2 } from 'lucide-react';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'blue' | 'amber' | 'neutral' | 'purple';
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
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : item.variant === 'rose'
            ? 'bg-rose-50 text-rose-600 border-rose-100'
            : item.variant === 'blue'
            ? 'bg-blue-50 text-blue-600 border-blue-100'
            : item.variant === 'amber'
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : item.variant === 'purple'
            ? 'bg-purple-50 text-purple-600 border-purple-100'
            : 'bg-slate-100 text-slate-600 border-slate-200';

        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className={clsx(
              'p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4',
              item.onClick && 'cursor-pointer'
            )}
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight truncate">{item.value}</h3>
              {item.subtext && (
                <p className="text-xs text-slate-500 truncate">{item.subtext}</p>
              )}
            </div>

            <div
              className={clsx(
                'w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 text-xl shadow-xs',
                bgBadgeColor
              )}
            >
              {item.icon || <CheckCircle2 className="w-6 h-6" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};
