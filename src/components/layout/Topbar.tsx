import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { ShieldCheck, AlertTriangle, Bell, Wifi, Clock, Cpu, Eye, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface TopbarProps {
  title: string;
  subtitle: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { alerts, finalDecision, cameras, setDeviceCameraModalOpen } = useSecurity();
  const [timeString, setTimeString] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', { hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasThreat = finalDecision === 'VERIFIED_THREAT' || alerts.some(a => a.status === 'ACTIVE');
  const activeCameras = cameras.filter(c => c.status === 'ONLINE').length;

  return (
    <header className="bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left Title & Breadcrumb */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2 leading-tight">
          {title}
        </h1>
        <p className="text-[11px] text-slate-400 font-medium truncate leading-tight">{subtitle}</p>
      </div>

      {/* Right Quick Telemetry & Actions */}
      <div className="flex items-center gap-2.5 text-xs">
        {/* Real-time Threat / Safe Status Pill */}
        {hasThreat ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 animate-pulse font-mono text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>SECURITY ALERT</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
        )}

        {/* Camera Count */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1424] border border-slate-800 text-slate-300 font-mono text-xs">
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <span>{activeCameras} / {cameras.length} Cameras</span>
        </div>

        {/* Device Camera Test Trigger */}
        <button
          onClick={() => setDeviceCameraModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1424] hover:bg-[#141e36] border border-slate-800 text-blue-400 text-xs font-bold transition"
          title="Open Device Camera Live AI Test"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Camera Test</span>
        </button>

        {/* Realtime Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1424] border border-slate-800 text-slate-300 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeString}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg bg-[#0e1424] hover:bg-[#141e36] border border-slate-800 text-slate-300 hover:text-white relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0d1424] border border-slate-800 rounded-xl shadow-2xl p-3.5 space-y-2.5 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-white">
                <span>Recent Events ({alerts.length})</span>
                <span className="text-[10px] text-blue-400 font-mono uppercase">Live Log</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent events logged</p>
                ) : (
                  alerts.slice(0, 5).map(alt => (
                    <div
                      key={alt.id}
                      className="p-2 rounded-lg bg-[#070a12] border border-slate-800 text-xs space-y-0.5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between text-rose-400 font-bold">
                        <span className="truncate">{alt.detectionType}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{alt.timestamp.slice(11, 19)}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono">
                        {alt.cameraName} • Dwell {alt.dwellDuration}s • Conf {Math.round(alt.confidence * 100)}%
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
