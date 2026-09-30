import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { ShieldCheck, AlertTriangle, Bell, Wifi, Clock, Eye, Sparkles } from 'lucide-react';
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

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 select-none shadow-xs">
      {/* Left Title & Subtitle */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 font-medium truncate leading-tight mt-0.5">{subtitle}</p>
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-3 text-xs">
        {/* Real-time Status Pill */}
        {hasThreat ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>Attention needed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Protection active</span>
          </div>
        )}

        {/* Camera Count */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
          <Wifi className="w-3.5 h-3.5 text-blue-600" />
          <span>{activeCameras} / {cameras.length} Cameras</span>
        </div>

        {/* Test Camera Trigger */}
        <button
          onClick={() => setDeviceCameraModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition"
          title="Open Web Camera Live AI Test"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Camera Test</span>
        </button>

        {/* Time */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeString}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-xs">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-900">
                <span>Recent Activity</span>
                <span className="text-[11px] text-blue-600 font-medium">{alerts.length} total</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent events logged</p>
                ) : (
                  alerts.slice(0, 5).map(alt => (
                    <div
                      key={alt.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1 hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="truncate">{alt.detectionType}</span>
                        <span className="text-[11px] text-slate-400 font-normal shrink-0">{alt.timestamp.slice(11, 16)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
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
