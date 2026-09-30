import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, Camera, Users, Bell, Activity, Clock, Cpu, Server } from 'lucide-react';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'rose' | 'blue' | 'amber' | 'neutral';
}

interface StatStripProps {
  items: StatItem[];
  className?: string;
}

export const StatStrip: React.FC<StatStripProps> = ({ items, className }) => {
  return (
    <div
      className={clsx(
        'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 p-2.5 bg-[#0b101d] border border-slate-800 rounded-xl shadow-lg',
        className
      )}
    >
      {items.map(item => {
        const valueColor =
          item.variant === 'emerald'
            ? 'text-emerald-400'
            : item.variant === 'rose'
            ? 'text-rose-400'
            : item.variant === 'blue'
            ? 'text-blue-400'
            : item.variant === 'amber'
            ? 'text-amber-400'
            : 'text-slate-100';

        return (
          <div
            key={item.id}
            className="flex flex-col justify-between p-2.5 rounded-lg bg-[#0e1526]/80 border border-slate-800/60 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider truncate">
              <span>{item.label}</span>
              {item.icon && <span className="opacity-70">{item.icon}</span>}
            </div>

            <div className="mt-1">
              <span className={clsx('text-base font-bold font-mono tracking-tight block truncate', valueColor)}>
                {item.value}
              </span>
              {item.subtext && (
                <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                  {item.subtext}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
