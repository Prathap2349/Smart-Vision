import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Wind, User, UserCheck, Bell, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const TripleGate3DStage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'INTRUDER' | 'RESIDENT' | 'WIND'>('INTRUDER');
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    setStep(0);
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % 4);
    }, 1800);
    return () => clearInterval(interval);
  }, [activeMode]);

  return (
    <div className="bg-gradient-to-b from-[#0a0f1d] to-[#060913] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden group">
      {/* Background Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar & simulator controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wide">Interactive 3D Corridor Visualizer</h3>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveMode('WIND')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeMode === 'WIND'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            <span>Wind &amp; Foliage</span>
          </button>

          <button
            onClick={() => setActiveMode('RESIDENT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeMode === 'RESIDENT'
                ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Family Member</span>
          </button>

          <button
            onClick={() => setActiveMode('INTRUDER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeMode === 'INTRUDER'
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-rose-300" />
            <span>Stranger (Intruder)</span>
          </button>
        </div>
      </div>

      {/* 3D Isometric Corridor Stage */}
      <div className="relative h-64 w-full flex items-center justify-center perspective-[1000px] overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800/80">
        {/* Isometric Corridor Floor Grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 transform rotate-x-[55deg] rotate-z-[-20deg] scale-125 border border-cyan-500/10 pointer-events-none" />

        {/* 3 Checkpoint Gate Arches */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-lg px-6">
          {/* Gate 1: Human Check */}
          <div
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
              step >= 1
                ? activeMode === 'WIND'
                  ? 'bg-slate-900/80 border-slate-700 text-slate-400 scale-95 opacity-60'
                  : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-lg shadow-cyan-500/20 scale-105'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <span className="text-[11px] font-bold tracking-tight">Human Check</span>
            <Badge variant={step >= 1 ? (activeMode === 'WIND' ? 'slate' : 'cyan') : 'slate'}>
              {step >= 1 ? (activeMode === 'WIND' ? 'IGNORED' : 'PERSON') : 'WAITING'}
            </Badge>
          </div>

          {/* Connecting Laser Beam 1 */}
          <div
            className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
              step >= 2 && activeMode !== 'WIND' ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-800'
            }`}
          />

          {/* Gate 2: Lingering Check */}
          <div
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
              step >= 2 && activeMode !== 'WIND'
                ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 shadow-lg shadow-blue-500/20 scale-105'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <span className="text-[11px] font-bold tracking-tight">Lingering Check</span>
            <Badge variant={step >= 2 && activeMode !== 'WIND' ? 'cyan' : 'slate'}>
              {step >= 2 && activeMode !== 'WIND' ? 'LOITERING >20s' : 'WAITING'}
            </Badge>
          </div>

          {/* Connecting Laser Beam 2 */}
          <div
            className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
              step >= 3 && activeMode !== 'WIND' ? 'bg-indigo-400 shadow-sm shadow-indigo-400' : 'bg-slate-800'
            }`}
          />

          {/* Gate 3: Face Check */}
          <div
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
              step >= 3 && activeMode !== 'WIND'
                ? activeMode === 'RESIDENT'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-105'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-lg shadow-rose-500/20 scale-105'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-[11px] font-bold tracking-tight">Family Check</span>
            <Badge
              variant={
                step >= 3 && activeMode !== 'WIND'
                  ? activeMode === 'RESIDENT'
                    ? 'emerald'
                    : 'rose'
                  : 'slate'
              }
            >
              {step >= 3 && activeMode !== 'WIND'
                ? activeMode === 'RESIDENT'
                  ? 'FAMILY MATCH'
                  : 'STRANGER'
                : 'WAITING'}
            </Badge>
          </div>
        </div>

        {/* Animated Moving Subject */}
        <div
          className="absolute bottom-6 transition-all duration-1000 ease-out z-20 flex flex-col items-center pointer-events-none"
          style={{
            left: `${Math.min(85, Math.max(10, step * 25 + 10))}%`,
          }}
        >
          {activeMode === 'WIND' ? (
            <div className="p-2 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 animate-bounce">
              <Wind className="w-5 h-5" />
            </div>
          ) : activeMode === 'RESIDENT' ? (
            <div className="p-2.5 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 animate-pulse">
              <UserCheck className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2.5 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>

      {/* Outcome Status Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
        <div className="flex items-center gap-3">
          {activeMode === 'WIND' ? (
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Wind className="w-4 h-4 text-slate-400" />
            </div>
          ) : activeMode === 'RESIDENT' ? (
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-400 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}

          <div>
            <p className="font-bold text-white">
              {activeMode === 'WIND'
                ? '🍃 Wind & Foliage Ignored'
                : activeMode === 'RESIDENT'
                ? '✓ Recognized Family Member'
                : '🚨 Verified Stranger Alert Fired'}
            </p>
            <p className="text-slate-400 text-[11px]">
              {activeMode === 'WIND'
                ? 'Filtered at Gate 1. Zero notifications sent to your phone.'
                : activeMode === 'RESIDENT'
                ? 'Recognized at Gate 3. Logged safely as family entry without disturbance.'
                : 'Passed all 3 gates (Human + Loitering + Unknown). Alert sent to phone in <1.4s.'}
            </p>
          </div>
        </div>

        {activeMode === 'INTRUDER' && step === 3 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold animate-bounce shadow-lg shadow-rose-600/30">
            <Bell className="w-4 h-4" />
            <span>PHONE BUZZ SENT</span>
          </div>
        )}
      </div>
    </div>
  );
};
