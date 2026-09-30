import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Bell, Wifi, Clock, Eye } from 'lucide-react';
import { AIStatusOrb } from '../ui/AIStatusOrb';

interface TopbarProps {
  title: string;
  subtitle: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { alerts, finalDecision, cameras, setDeviceCameraModalOpen, operatingMode } = useSecurity();
  const [timeString, setTimeString] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasThreat = finalDecision === 'VERIFIED_THREAT' || alerts.some(a => a.status === 'ACTIVE');
  const activeCameras = cameras.filter(c => c.status === 'ONLINE').length;
  const isDemoMode = operatingMode === 'DEMO_SIMULATION';

  return (
    <header className="bg-aurora-surface/60 backdrop-blur-xl border-b border-white/10 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left Title & Subtitle */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-text-primary tracking-tight flex items-center gap-2 leading-tight">
          {title}
        </h1>
        <p className="text-xs text-text-muted font-medium truncate leading-tight mt-0.5">{subtitle}</p>
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-3 text-xs">
        {/* Demo Mode indicator */}
        {isDemoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-warning/15 border border-brand-warning/30 text-amber-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-brand-warning" />
            <span>Demo Mode</span>
          </div>
        )}

        {/* Real-time Status Pill */}
        {hasThreat ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-alert/15 border border-brand-alert/30 text-rose-400 text-xs font-semibold shadow-rose-glow">
            <AIStatusOrb status="ALERT" size="sm" />
            <span>Attention needed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-success/10 border border-brand-success/30 text-brand-success text-xs font-semibold">
            <AIStatusOrb status="ACTIVE" size="sm" />
            <span>Protection active</span>
          </div>
        )}

        {/* Camera Count */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary font-medium text-xs">
          <Wifi className="w-3.5 h-3.5 text-brand-cyan" />
          <span>{activeCameras} / {cameras.length} Cameras</span>
        </div>

        {/* Test Camera Trigger */}
        <button
          onClick={() => setDeviceCameraModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-blue-300 text-xs font-semibold transition-all"
          title="Open Web Camera Live AI Test"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Camera Test</span>
        </button>

        {/* Time */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-text-muted font-medium text-xs">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>{timeString}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary hover:text-text-primary relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-alert text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-rose-glow">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-aurora-elevated border border-white/15 rounded-2xl shadow-2xl shadow-black/50 p-4 space-y-3 z-50 backdrop-blur-lg">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-bold text-text-primary">
                <span>Recent Activity</span>
                <span className="text-[11px] text-brand-cyan font-medium">{alerts.length} total</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">No recent events logged</p>
                ) : (
                  alerts.slice(0, 5).map(alt => (
                    <div
                      key={alt.id}
                      className="p-2.5 rounded-xl bg-aurora-surface/80 border border-white/10 text-xs space-y-1 hover:bg-aurora-elevated transition"
                    >
                      <div className="flex items-center justify-between font-bold text-text-primary">
                        <span className="truncate">{alt.detectionType}</span>
                        <span className="text-[11px] text-text-muted font-normal shrink-0">{alt.timestamp.slice(11, 16)}</span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {alt.cameraName} • {alt.dwellDuration}s dwell
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
