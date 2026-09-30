import React from 'react';
import { Card } from './Card';
import { StatusBadge, StatusVariant } from './StatusBadge';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  statusText?: string;
  statusVariant?: StatusVariant;
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
    <Card className="flex flex-col justify-between relative overflow-hidden group p-4 bg-white border-slate-200/80 shadow-xs hover:shadow-sm">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-snug truncate">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight truncate">{value}</h3>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 min-w-0">
        {subtitle && <span className="text-xs text-slate-500 min-w-0 truncate font-sans">{subtitle}</span>}
        {statusText && (
          <StatusBadge variant={statusVariant} size="sm" className="shrink-0">
            {statusText}
          </StatusBadge>
        )}
        {trend && <span className="text-xs text-emerald-600 font-semibold shrink-0">{trend}</span>}
      </div>
    </Card>
  );
};
