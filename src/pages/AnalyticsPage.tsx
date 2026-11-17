import React, { useEffect, useState } from 'react';
import { Activity, BarChart2, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../services/api';

type EvaluationResponse = {
  status: string;
  has_evaluation_results: boolean;
  metrics?: Record<string, number | null> | null;
  sample_size?: number;
  warning?: string | null;
  inventory?: {
    clips_on_disk_count?: number;
    missing_files?: string[];
    unlabelled_clips?: string[];
    clip_inventory?: Array<{ video: string; labelled: boolean }>;
  };
  message?: string;
};

const metricLabels: Array<[string, string, boolean]> = [
  ['precision', 'Precision', true],
  ['recall', 'Recall', true],
  ['f1_score', 'F1', true],
  ['false_alarms_per_hour', 'False alarms per hour', false],
  ['false_accept_rate', 'False accept rate (FAR)', true],
  ['false_reject_rate', 'False reject rate (FRR)', true],
];

export const AnalyticsPage: React.FC = () => {
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);

  useEffect(() => {
    let active = true;
    api.getLatestEvaluation().then((result) => {
      if (active) setEvaluation(result);
    });
    return () => { active = false; };
  }, []);

  const metrics = evaluation?.metrics;
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Evaluation"
        subtitle="Results from real labelled clips, with held-out sample sizes shown alongside every metric."
        icon={<BarChart2 className="w-5 h-5" />}
      />

      <Card className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-300 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-text-primary">Dataset status: {evaluation?.status ?? 'LOADING'}</h3>
            <p className="text-xs text-text-secondary mt-1">
              {evaluation?.message ?? 'Checking the real clip inventory.'}
            </p>
            {evaluation?.warning && <p className="text-xs text-amber-300 mt-2">{evaluation.warning}</p>}
          </div>
        </div>

        {evaluation?.has_evaluation_results && metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Held-out evaluation metrics">
            {metricLabels.map(([key, label, percentage]) => {
              const value = metrics[key];
              return (
                <div key={key} className="rounded-lg border border-white/10 bg-aurora-elevated/60 p-3">
                  <div className="text-xs text-text-muted">{label}</div>
                  <div className="text-lg font-semibold text-text-primary mt-1">
                    {value == null ? 'Not measurable' : `${percentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)}`}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">Held-out sample: n={evaluation.sample_size ?? 0} clips</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-aurora-elevated/60 p-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <Activity className="w-4 h-4" /> INSUFFICIENT_DATASET
            </div>
            <p className="mt-2">No accuracy numbers are available until real clips are recorded and labelled. No demo values are substituted.</p>
            <p className="mt-2">
              Clips on disk: {evaluation?.inventory?.clips_on_disk_count ?? 0}; missing labelled clips: {evaluation?.inventory?.missing_files?.length ?? 0}; unlabelled clips: {evaluation?.inventory?.unlabelled_clips?.length ?? 0}.
            </p>
            {evaluation?.inventory?.clip_inventory?.length ? (
              <ul className="mt-2 max-h-48 overflow-auto list-disc pl-5">
                {evaluation.inventory.clip_inventory.map((clip) => (
                  <li key={clip.video}>{clip.video} — {clip.labelled ? 'labelled' : 'unlabelled'}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};
