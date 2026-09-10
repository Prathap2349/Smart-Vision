import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TripleGate3DStage } from '../components/common/TripleGate3DStage';
import { LoginModal } from '../components/common/LoginModal';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Clock,
  UserCheck,
  Video,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // Counter animation: 99 false alarms down to 3
  const [alarmCount, setAlarmCount] = useState<number>(99);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setAlarmCount(prev => {
          if (prev <= 3) {
            clearInterval(interval);
            return 3;
          }
          return prev - 4;
        });
      }, 40);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg text-white tracking-tight block leading-none">
              Smart Vision
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Residential Security</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLoginModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition"
          >
            Sign In
          </button>

          <button
            onClick={() => setLoginModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-6xl mx-auto w-full space-y-16 py-12 relative z-10">
        {/* Section 1: Problem & Solution Story Statement */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Problem: CCTV Notification Fatigue</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Your camera pings you 99 times a day.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400">
              96 of them are wind.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Smart Vision only wakes you up for an actual stranger loitering at your door — not swaying leaves, not shadows, and not your family.
          </p>

          {/* Animated 99 -> 3 Alert Counter Highlight */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 max-w-xl mx-auto flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs text-slate-400 block uppercase font-semibold">Traditional CCTV</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-500 line-through">99+</span>
              <span className="text-[11px] text-rose-400 block">pings / day (mostly wind)</span>
            </div>

            <span className="text-2xl text-slate-600 font-bold">→</span>

            <div className="text-center">
              <span className="text-xs text-slate-400 block uppercase font-semibold">Smart Vision</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 animate-pulse">
                &lt;{alarmCount}
              </span>
              <span className="text-[11px] text-emerald-400 block">verified alerts / day</span>
            </div>
          </div>
        </div>

        {/* Section 2: 3D Interactive Triple-Gate Demonstration */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">How Smart Vision Filters False Alarms</h2>
            <p className="text-xs text-slate-400">Test how the 3-question check handles wind vs family vs strangers in real time</p>
          </div>
          <TripleGate3DStage />
        </div>

        {/* Section 3: 3 Plain Steps Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" /> Sees a Person
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Filters out blowing leaves, animals, rain, headlights, and swaying trees. Only registers when a human silhouette is detected.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> Watches if They Linger
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Passersby and delivery drivers walking past don't trigger alarms. System tracks loitering duration (&gt;20 seconds in corridor).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Checks Family Faces
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compares detected faces against your enrolled family whitelist. Family members pass safely without bothering your phone.
            </p>
          </div>
        </div>

        {/* Section 4: "Why Usual Fixes Fail" FAQ */}
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" /> Why Traditional CCTV Tweaks Don't Work
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> &ldquo;Why not just lower camera motion sensitivity?&rdquo;
              </p>
              <p className="text-slate-400 leading-relaxed">
                Lowering sensitivity makes the camera ignore small motion, but actual slow-moving intruders will be missed entirely. Sensitivity tweaking doesn't solve motion vs human intent.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> &ldquo;Why not just mute camera notifications?&rdquo;
              </p>
              <p className="text-slate-400 leading-relaxed">
                Muting notifications eliminates the noise, but it completely destroys your security coverage. You won't know if someone is lingering outside until it's too late.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Works With Your Existing CCTV Logo Strip */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Works with your existing home CCTV cameras
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-300">
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-400" /> Hikvision
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-400" /> Dahua
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400" /> CP Plus
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400" /> TP-Link Tapo
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" /> Reolink
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400" /> Standard RTSP
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 relative z-20">
        <p>Smart Vision Sentry • BTech AI&amp;DS Project (Prathap S - 25102159)</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <Lock className="w-3.5 h-3.5" /> 100% Local Edge Privacy
          </span>
          <span>FastAPI + React</span>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
};
