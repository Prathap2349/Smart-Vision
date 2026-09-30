import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

export const DecisionPipelineWidget: React.FC = () => {
  const { simulatedPerson, gate1Human, gate2Dwell, gate3Unknown, finalDecision, settings } = useSecurity();

  return (
    <Card className="flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Triple-Gate Decision Engine
            </h3>
          </div>
          <StatusBadge variant="info" pulse label="RULE EVALUATION" />
        </div>

        <p className="text-[11px] text-slate-400 mb-3 font-mono">
          Evaluating: <span className="text-blue-300 font-bold">Human</span> ∧{' '}
          <span className="text-amber-300 font-bold">Dwell &gt; {settings.dwellThresholdSeconds}s</span> ∧{' '}
          <span className="text-rose-300 font-bold">Unknown Face</span>
        </p>

        <div className="space-y-2.5">
          {/* Gate 1 */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              gate1Human
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-[#080d1a] border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide text-[11px]">GATE 1: HUMAN SILHOUETTE</span>
              {gate1Human ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS ({Math.round(simulatedPerson.confidence * 100)}%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-xs">
                  <XCircle className="w-3.5 h-3.5" /> NO HUMAN
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">YOLOv8-Nano object detection</p>
          </div>

          {/* Gate 2 */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              gate2Dwell
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-[#080d1a] border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide text-[11px]">
                GATE 2: DWELL &gt; {settings.dwellThresholdSeconds}s
              </span>
              {gate2Dwell ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS ({simulatedPerson.dwellSeconds}s)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-mono font-bold">
                  {simulatedPerson.dwellSeconds}s / {settings.dwellThresholdSeconds}s
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">IoU temporal tracker timer</p>
          </div>

          {/* Gate 3 */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              gate3Unknown
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-[#080d1a] border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide text-[11px]">GATE 3: BIOMETRIC RECOGNITION</span>
              {simulatedPerson.faceStatus === 'UNKNOWN' ? (
                <span className="flex items-center gap-1 font-bold text-rose-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> UNKNOWN (PASS)
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-emerald-400 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> RESIDENT (SUPPRESS)
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">InsightFace ArcFace 512-D match</p>
          </div>
        </div>
      </div>

      {/* Final Decision Banner */}
      <div className="pt-3 border-t border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">
          Compound Decision Output
        </span>
        {finalDecision === 'VERIFIED_THREAT' && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-xs">🚨 VERIFIED THREAT</span>
            </div>
            <StatusBadge variant="danger" pulse label="ALERT DISPATCHED" />
          </div>
        )}

        {finalDecision === 'SAFE_RESIDENT' && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs">✓ SAFE — RESIDENT WHITELISTED</span>
            </div>
            <StatusBadge variant="success" label="ALERT SUPPRESSED" />
          </div>
        )}

        {finalDecision === 'MONITORING' && (
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-300">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-xs font-mono">TRACKING ({simulatedPerson.dwellSeconds}s)</span>
            </div>
            <StatusBadge variant="info" label="EVALUATING" />
          </div>
        )}

        {finalDecision === 'CLEAR' && (
          <div className="p-3 rounded-xl bg-[#080d1a] border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">ZONE CLEAR — NO SUBJECTS</span>
            <StatusBadge variant="neutral" label="STANDBY" />
          </div>
        )}
      </div>
    </Card>
  );
};
