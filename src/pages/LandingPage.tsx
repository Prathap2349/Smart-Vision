import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { TripleGate3DStage } from '../components/common/TripleGate3DStage';
import { LoginModal } from '../components/common/LoginModal';
import { DeviceCameraTestModal } from '../components/common/DeviceCameraTestModal';
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
  Camera,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const { deviceCameraModalOpen, setDeviceCameraModalOpen } = useSecurity();
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-200/80 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight block leading-none">
              Smart Vision
            </span>
            <span className="text-xs text-slate-500 font-medium">Smart home protection</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDeviceCameraModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 transition shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Test with Webcam</span>
          </button>

          <button
            onClick={() => setLoginModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs"
          >
            Sign In
          </button>

          <button
            onClick={() => setLoginModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Problem: Notification Fatigue From Security Cameras</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Your camera pings you 99 times a day.{' '}
            <span className="text-blue-600">
              96 of them are just wind.
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Smart Vision only notifies you for genuine strangers lingering near your home — not swaying trees, not shadows, and not your family returning home.
          </p>

          {/* Animated 99 -> 3 Alert Counter Highlight */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-xl mx-auto flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs text-slate-400 block uppercase font-semibold">Traditional CCTV</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-500 line-through">99+</span>
              <span className="text-xs text-slate-500 block mt-0.5">pings / day (mostly false)</span>
            </div>

            <span className="text-2xl text-slate-300 font-bold">→</span>

            <div className="text-center">
              <span className="text-xs text-slate-400 block uppercase font-semibold">Smart Vision</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 animate-pulse">
                &lt;{alarmCount}
              </span>
              <span className="text-xs text-emerald-700 font-semibold block mt-0.5">verified alerts / day</span>
            </div>
          </div>
        </div>

        {/* Section 2: 3D Interactive Triple-Gate Demonstration */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">How Smart Vision Filters False Alarms</h2>
            <p className="text-xs text-slate-500">Test how the 3-condition check handles wind vs family vs strangers in real time</p>
          </div>
          <div className="bg-slate-950 rounded-2xl p-4 shadow-md overflow-hidden text-slate-100">
            <TripleGate3DStage />
          </div>
        </div>

        {/* Section 3: 3 Plain Steps Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Sees a Person
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Filters out blowing leaves, animals, rain, headlights, and swaying trees. Only activates when a human silhouette is detected.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Watches if They Linger
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Passersby and delivery drivers walking past don't trigger alarms. System tracks loitering duration (&gt;20 seconds near your door).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Checks Family Faces
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compares detected faces against your enrolled household whitelist. Family members pass safely without bothering your phone.
            </p>
          </div>
        </div>

        {/* Section 4: Works With Your Existing CCTV */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Works with your existing home CCTV cameras
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-600" /> Hikvision
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" /> Dahua
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" /> CP Plus
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-600" /> TP-Link Tapo
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" /> Reolink
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-600" /> Standard RTSP / Webcams
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 relative z-20">
        <p>Smart Vision • Intelligent Home Security Application</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> 100% Local Edge Privacy
          </span>
          <span>FastAPI + React</span>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Real Device Camera Test Modal */}
      <DeviceCameraTestModal isOpen={deviceCameraModalOpen} onClose={() => setDeviceCameraModalOpen(false)} />
    </div>
  );
};
