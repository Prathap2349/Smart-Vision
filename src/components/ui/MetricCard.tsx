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
  const displayVal = value === '' || value === undefined || value === null ? '—' : value;

  return (
    <Card className="flex flex-col justify-between relative overflow-hidden group p-5 bg-aurora-surface/85 border-white/10 shadow-card-glass hover:bg-aurora-elevated hover:border-brand-blue/30 transition-all duration-200">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider leading-snug truncate">{title}</p>
          <h3 className="text-2xl font-bold text-text-primary mt-1.5 tracking-tight truncate">{displayVal}</h3>
        </div>
        <div className="p-2.5 rounded-xl bg-brand-blue/15 text-brand-cyan border border-brand-blue/30 shadow-cyan-glow shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 min-w-0">
        {subtitle && <span className="text-xs text-text-secondary min-w-0 truncate font-sans">{subtitle}</span>}
        {statusText && (
          <StatusBadge variant={statusVariant} size="sm" className="shrink-0">
            {statusText}
          </StatusBadge>
        )}
        {trend && <span className="text-xs text-brand-success font-semibold shrink-0">{trend}</span>}
      </div>
    </Card>
  );
};
