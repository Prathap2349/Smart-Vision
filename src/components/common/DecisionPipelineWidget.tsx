import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

export const DecisionPipelineWidget: React.FC = () => {
  const { simulatedPerson, gate1Human, gate2Dwell, gate3Unknown, finalDecision, settings } = useSecurity();
  const [showTechnical, setShowTechnical] = useState(false);

  const isAlert = finalDecision === 'VERIFIED_THREAT';
  const isSafe = finalDecision === 'SAFE_RESIDENT';
  const isMonitoring = finalDecision === 'MONITORING';

  return (
    <Card className="flex flex-col justify-between space-y-4 bg-white border-slate-200/80 shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Why this alert?
              </h3>
              <p className="text-[11px] text-slate-500">Smart notification reasoning</p>
            </div>
          </div>

          <StatusBadge
            variant={isAlert ? 'danger' : isSafe ? 'success' : isMonitoring ? 'info' : 'neutral'}
            label={isAlert ? 'Alert Fired' : isSafe ? 'Verified Safe' : isMonitoring ? 'Analyzing' : 'All Clear'}
          />
        </div>

        {/* Consumer-friendly Checklist View */}
        <div className="space-y-2.5">
          {/* Item 1: Person presence */}
          <div className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
            gate1Human ? 'bg-blue-50/60 border-blue-100 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            {gate1Human ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                {gate1Human ? 'Person detected' : 'No person detected'}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {gate1Human
                  ? `Identified human movement with ${Math.round(simulatedPerson.confidence * 100)}% clarity.`
                  : 'Monitoring camera view for activity.'}
              </p>
            </div>
          </div>

          {/* Item 2: Stayed near entrance */}
          <div className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
            gate2Dwell ? 'bg-amber-50/60 border-amber-100 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            {gate2Dwell ? (
              <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center mt-0.5 shrink-0 text-[10px] text-slate-400 font-bold">
                2
              </div>
            )}
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                {gate2Dwell ? `Stayed near entrance (${simulatedPerson.dwellSeconds}s)` : 'Passing through normally'}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {gate2Dwell
                  ? `Subject remained in the protected zone longer than ${settings.dwellThresholdSeconds}s.`
                  : `Current duration: ${simulatedPerson.dwellSeconds}s (Alert threshold: ${settings.dwellThresholdSeconds}s).`}
              </p>
            </div>
          </div>

          {/* Item 3: Recognition */}
          <div className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
            isAlert ? 'bg-rose-50/60 border-rose-100 text-slate-800' : isSafe ? 'bg-emerald-50/60 border-emerald-100 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-500'
          }`}>
            {isSafe ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : isAlert ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center mt-0.5 shrink-0 text-[10px] text-slate-400 font-bold">
                3
              </div>
            )}
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                {isSafe
                  ? `Recognized household member: ${simulatedPerson.residentName || 'Resident'}`
                  : isAlert
                  ? 'Unrecognized person'
                  : 'Verifying face biometrics'}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {isSafe
                  ? 'Known family member detected — alerts automatically silenced.'
                  : isAlert
                  ? 'Person is not registered on your household whitelist.'
                  : 'Checking against enrolled household face database.'}
              </p>
            </div>
          </div>
        </div>

        {/* Friendly explanation text */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed mt-3">
          {isAlert ? (
            <p className="text-rose-800 font-medium">
              ⚠️ <strong>Notification sent:</strong> Smart Vision alerted you because an unrecognized person remained near your entrance longer than {settings.dwellThresholdSeconds} seconds.
            </p>
          ) : isSafe ? (
            <p className="text-emerald-800 font-medium">
              ✓ <strong>Protected &amp; quiet:</strong> No alert was sent because this person is recognized as a trusted household member.
            </p>
          ) : isMonitoring ? (
            <p className="text-blue-800 font-medium">
              👀 <strong>Observing:</strong> Tracking active person in camera view. No alert needed unless they loiter without recognition.
            </p>
          ) : (
            <p className="text-slate-500">
              Smart Vision continuously watches for unknown loiterers while letting your family pass freely without false alarms.
            </p>
          )}
        </div>

        {/* Collapsible Technical Details Toggle */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-blue-600 font-medium py-1 transition"
          >
            <span>View technical pipeline details</span>
            {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnical && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 border border-slate-800 animate-fadeIn">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">Gate 1 (YOLOv8-Nano):</span>
                <span className={gate1Human ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {gate1Human ? `PASS (${Math.round(simulatedPerson.confidence * 100)}%)` : 'FAIL'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">Gate 2 (IoU Dwell):</span>
                <span className={gate2Dwell ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {simulatedPerson.dwellSeconds}s / {settings.dwellThresholdSeconds}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gate 3 (InsightFace ArcFace):</span>
                <span className={simulatedPerson.faceStatus === 'UNKNOWN' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {simulatedPerson.faceStatus || 'SEARCHING'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
