import React from 'react';
import { clsx } from 'clsx';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
  variant?: 'card' | 'metric' | 'camera' | 'activity';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  className,
  variant = 'card',
}) => {
  if (variant === 'camera') {
    return (
      <div className={clsx('rounded-2xl bg-aurora-surface/80 border border-white/10 overflow-hidden animate-pulse', className)}>
        <div className="aspect-video bg-aurora-bg/80" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'metric') {
    return (
      <div className={clsx('p-5 rounded-2xl bg-aurora-surface/80 border border-white/10 animate-pulse', className)}>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-7 bg-white/10 rounded w-1/3" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5" />
        </div>
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (variant === 'activity') {
    return (
      <div className={clsx('flex gap-4 p-4 rounded-xl animate-pulse', className)}>
        <div className="w-9 h-9 rounded-xl bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
        <div className="h-3 bg-white/5 rounded w-16 shrink-0" />
      </div>
    );
  }

  return (
    <div className={clsx('p-5 rounded-2xl bg-aurora-surface/80 border border-white/10 space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx('h-3 bg-white/10 rounded', i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/3' : 'w-full')}
        />
      ))}
    </div>
  );
};
