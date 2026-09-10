import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  statusText?: string;
  statusVariant?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';
  icon: React.ReactNode;
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  statusText,
  statusVariant = 'emerald',
  icon,
  trend,
}) => {
  return (
    <Card className="flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1 tracking-tight truncate">{value}</h3>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-800/80 text-cyan-400 group-hover:bg-cyan-950/60 transition-colors shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 min-w-0">
        {subtitle && <span className="text-xs text-slate-400 font-mono min-w-0 break-words">{subtitle}</span>}
        {statusText && (
          <Badge variant={statusVariant} pulse={statusVariant === 'rose'} className="shrink-0">
            {statusText}
          </Badge>
        )}
        {trend && <span className="text-xs text-emerald-400 font-medium shrink-0">{trend}</span>}
      </div>
    </Card>
  );
};
