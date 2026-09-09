import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Cpu, Server, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('prathap.s@rathinam.edu.in');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-cyan-glow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Smart Vision Sentry</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="cyan" pulse>EDGE AI ONLINE</Badge>
          <Badge variant="emerald">LOCAL PROCESSING</Badge>
        </div>
      </header>

      {/* Main Content & Login Card */}
      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto py-12 relative z-10">
        {/* Left Column: Vision & Pitch */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            <Zap className="w-3.5 h-3.5" /> Triple-Gate AI False Alarm Elimination
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            See what matters. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Ignore what doesn't.
            </span>
          </h1>

          <p className="text-slate-400 text-base max-w-xl leading-relaxed">
            AI-powered residential CCTV intelligence designed to eliminate pixel-motion false alarms. 
            Replaces 99+ daily motion pings with semantically verified security alerts (<span className="text-cyan-300 font-semibold">&lt;4 verified alerts/day</span>).
          </p>

          {/* Core Pipeline Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#0e1628] border border-slate-800 space-y-1">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <p className="font-bold text-xs text-white">YOLOv8-Nano</p>
              <p className="text-[11px] text-slate-400">Semantic Human Detection</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1628] border border-slate-800 space-y-1">
              <Server className="w-5 h-5 text-blue-400" />
              <p className="font-bold text-xs text-white">ByteTrack</p>
              <p className="text-[11px] text-slate-400">Dwell Time &gt; 20s</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0e1628] border border-slate-800 space-y-1">
              <Shield className="w-5 h-5 text-emerald-400" />
              <p className="font-bold text-xs text-white">InsightFace</p>
              <p className="text-[11px] text-slate-400">Resident Whitelisting</p>
            </div>
          </div>

          {/* Features check list */}
          <div className="space-y-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero cloud video streaming — 100% local edge AI processing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Telegram bot & web push alerts within &lt; 2.0s latency</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Resident feedback loop continuously tunes environmental thresholds</span>
            </div>
          </div>
        </div>

        {/* Right Column: SOC Login Box */}
        <div className="lg:col-span-5">
          <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" /> SOC Terminal Access
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your administrative credentials to open the Smart Vision Sentry dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Email / Admin ID</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition shadow-cyan-glow flex items-center justify-center gap-2 group"
              >
                <span>Enter Security Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
              <button
                onClick={() => login()}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
              >
                Instant One-Click Demo Access
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono relative z-10">
        <p>Smart Vision Sentry • BTech AI&amp;DS Project (Prathap S - 25102159)</p>
        <p>Edge AI Platform v1.0.0 • Local RTSP Analytics</p>
      </footer>
    </div>
  );
};
