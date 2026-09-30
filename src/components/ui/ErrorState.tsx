import React, { useState } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  technicalDetails?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Connection issue',
  message,
  technicalDetails,
  onRetry,
  className,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div
      className={clsx(
        'p-6 rounded-2xl border border-brand-alert/30 bg-aurora-surface/90 backdrop-blur-md shadow-rose-glow space-y-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-brand-alert/15 border border-brand-alert/30 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed font-sans">{message}</p>
      </div>

      {onRetry && (
        <div className="flex justify-center pt-1">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-semibold shadow-blue-glow transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry connection
          </button>
        </div>
      )}

      {technicalDetails && (
        <div className="pt-2 border-t border-white/10 text-left">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showTechnical ? 'Hide technical details' : 'View technical details'}
          </button>
          {showTechnical && (
            <div className="mt-2 p-3 rounded-xl bg-aurora-bg/90 border border-white/10 font-mono text-[11px] text-text-secondary break-all">
              {technicalDetails}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
