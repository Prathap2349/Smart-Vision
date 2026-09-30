import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { TripleGate3DStage } from '../components/common/TripleGate3DStage';
import { LoginModal } from '../components/common/LoginModal';
import { DeviceCameraTestModal } from '../components/common/DeviceCameraTestModal';
import {
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  Clock,
  UserCheck,
  Video,
  Lock,
  Camera,
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AuroraBackground';

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
    <AuroraBackground>
      <div className="min-h-screen text-text-primary flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden select-none">
        {/* Header Bar */}
        <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-violet flex items-center justify-center shadow-lg shadow-brand-blue/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-text-primary tracking-tight block leading-none">
                Smart Vision
              </span>
              <span className="text-xs text-text-muted font-medium">Smart home protection</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDeviceCameraModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-xs font-semibold text-blue-300 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Test with Webcam</span>
            </button>

            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/10 transition"
            >
              Sign In
            </button>

            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-xs font-bold text-white transition shadow-blue-glow flex items-center gap-1.5"
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-alert/15 border border-brand-alert/30 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Problem: Notification Fatigue From Security Cameras</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
              Your camera pings you 99 times a day.{' '}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-blue bg-clip-text text-transparent">
                96 of them are just wind.
              </span>
            </h1>

            <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
              Smart Vision only notifies you for genuine strangers lingering near your home — not swaying trees, not shadows, and not your family returning home.
            </p>

            {/* Animated 99 -> 3 Alert Counter */}
            <div className="p-6 rounded-2xl bg-aurora-surface/90 border border-white/10 shadow-card-glass backdrop-blur-md max-w-xl mx-auto flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs text-text-muted block uppercase font-semibold">Traditional CCTV</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-brand-alert line-through">99+</span>
                <span className="text-xs text-text-secondary block mt-0.5">pings / day (mostly false)</span>
              </div>

              <span className="text-2xl text-text-muted font-bold">→</span>

              <div className="text-center">
                <span className="text-xs text-text-muted block uppercase font-semibold">Smart Vision</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-brand-success animate-pulse">
                  &lt;{alarmCount}
                </span>
                <span className="text-xs text-brand-success font-semibold block mt-0.5">verified alerts / day</span>
              </div>
            </div>
          </div>

          {/* Section 2: 3D Interactive Triple-Gate Demonstration */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">How Smart Vision Filters False Alarms</h2>
              <p className="text-xs text-text-muted">Test how the 3-condition check handles wind vs family vs strangers in real time</p>
            </div>
            <div className="bg-aurora-bg rounded-2xl p-4 shadow-card-glass overflow-hidden border border-white/10 text-text-primary">
              <TripleGate3DStage />
            </div>
          </div>

          {/* Section 3: 3 Plain Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-2xl bg-aurora-surface/80 border border-white/10 shadow-card-glass backdrop-blur-md space-y-3 hover:border-brand-blue/30 hover:shadow-aurora-glow transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-cyan flex items-center justify-center font-bold text-base shadow-cyan-glow">
                1
              </div>
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-cyan" /> Sees a Person
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Filters out blowing leaves, animals, rain, headlights, and swaying trees. Only activates when a human silhouette is detected.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-aurora-surface/80 border border-white/10 shadow-card-glass backdrop-blur-md space-y-3 hover:border-brand-warning/30 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-brand-warning/15 border border-brand-warning/30 text-amber-300 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300" /> Watches if They Linger
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Passersby and delivery drivers walking past don't trigger alarms. System tracks loitering duration (&gt;20 seconds near your door).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-aurora-surface/80 border border-white/10 shadow-card-glass backdrop-blur-md space-y-3 hover:border-brand-success/30 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-brand-success/15 border border-brand-success/30 text-brand-success flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-success" /> Checks Family Faces
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Compares detected faces against your enrolled household whitelist. Family members pass safely without bothering your phone.
              </p>
            </div>
          </div>

          {/* Section 4: Works With Your Existing CCTV */}
          <div className="p-6 rounded-2xl bg-aurora-surface/80 border border-white/10 shadow-card-glass backdrop-blur-md space-y-4 text-center">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Works with your existing home CCTV cameras
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-text-secondary">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-brand-alert" /> Hikvision
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-brand-blue" /> Dahua
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-brand-success" /> CP Plus
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-brand-cyan" /> TP-Link Tapo
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-brand-violet" /> Reolink
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 hover:border-brand-blue/30 transition">
                <Video className="w-4 h-4 text-text-muted" /> Standard RTSP / Webcams
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-text-muted gap-3 relative z-20">
          <p>Smart Vision • Intelligent Home Security Application</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-brand-success font-medium">
              <Lock className="w-3.5 h-3.5" /> 100% Local Edge Privacy
            </span>
            <span>FastAPI + React</span>
          </div>
        </footer>

        {/* Login Modal */}
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        {/* Real Device Camera Test Modal */}
        <DeviceCameraTestModal isOpen={deviceCameraModalOpen} onClose={() => setDeviceCameraModalOpen(false)} />
      </div>
    </AuroraBackground>
  );
};
