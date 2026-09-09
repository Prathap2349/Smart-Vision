import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const DecisionPipelineWidget: React.FC = () => {
  const { simulatedPerson, gate1Human, gate2Dwell, gate3Unknown, finalDecision, settings } = useSecurity();

  return (
    <div className="bg-[#0b101d] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              AI Decision Engine
            </h3>
          </div>
          <Badge variant="cyan" pulse>3-GATE PIPELINE</Badge>
        </div>

        <p className="text-xs text-slate-400 mb-4 font-mono">
          Evaluating rule: <span className="text-cyan-300 font-bold">Human</span> AND <span className="text-cyan-300 font-bold">Dwell &gt; {settings.dwellThresholdSeconds}s</span> AND <span className="text-cyan-300 font-bold">Unknown Face</span>
        </p>

        <div className="space-y-3">
          {/* Gate 1 */}
          <div className={`p-3 rounded-lg border transition-all ${
            gate1Human ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide">GATE 1: HUMAN DETECTED</span>
              {gate1Human ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> PASS ({Math.round(simulatedPerson.confidence * 100)}%)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <XCircle className="w-4 h-4" /> NO HUMAN
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">High-accuracy AI human presence detection</p>
          </div>

          {/* Gate 2 */}
          <div className={`p-3 rounded-lg border transition-all ${
            gate2Dwell ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide">
                GATE 2: DWELL &gt; {settings.dwellThresholdSeconds}s
              </span>
              {gate2Dwell ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> PASS ({simulatedPerson.dwellSeconds}s)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  {simulatedPerson.dwellSeconds}s / {settings.dwellThresholdSeconds}s
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Real-time loitering duration counter</p>
          </div>

          {/* Gate 3 */}
          <div className={`p-3 rounded-lg border transition-all ${
            gate3Unknown ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide">GATE 3: UNKNOWN FACE</span>
              {simulatedPerson.faceStatus === 'UNKNOWN' ? (
                <span className="flex items-center gap-1 font-bold text-rose-400">
                  <CheckCircle2 className="w-4 h-4" /> PASS (UNKNOWN)
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> KNOWN RESIDENT
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Resident facial whitelist check</p>
          </div>
        </div>
      </div>

      {/* Final Decision Banner */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
          Final Logic Evaluation
        </span>
        {finalDecision === 'VERIFIED_THREAT' && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="font-bold text-sm">🚨 VERIFIED THREAT</span>
            </div>
            <Badge variant="rose" pulse>ALERT FIRED</Badge>
          </div>
        )}

        {finalDecision === 'SAFE_RESIDENT' && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm">✓ SAFE — NO ALERT</span>
            </div>
            <Badge variant="emerald">WHITELISTED</Badge>
          </div>
        )}

        {finalDecision === 'MONITORING' && (
          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="font-medium text-xs">TRACKING SUBJECT ({simulatedPerson.dwellSeconds}s)</span>
            </div>
            <Badge variant="cyan">EVALUATING</Badge>
          </div>
        )}

        {finalDecision === 'CLEAR' && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">ZONE CLEAR — NO SUBJECTS</span>
            <Badge variant="slate">IDLE</Badge>
          </div>
        )}
      </div>
    </div>
  );
};
