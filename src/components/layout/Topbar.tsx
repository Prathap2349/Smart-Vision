import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { ShieldCheck, AlertTriangle, Bell, Wifi, Clock, Cpu } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TopbarProps {
  title: string;
  subtitle: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { alerts, finalDecision, cameras } = useSecurity();
  const [timeString, setTimeString] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
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
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Emergency/Security Status Indicator */}
        {hasThreat ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 animate-pulse shadow-lg shadow-rose-600/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="font-bold">Security Alert Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">System Status: Secure</span>
          </div>
        )}

        {/* System Status */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>AI Protection Active</span>
        </div>

        {/* Cameras Status */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>{activeCameras} / {cameras.length} Cameras Active</span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-bold">
          <Clock className="w-4 h-4" />
          <span>{timeString}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white relative transition"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-white">
                <span>Security Notifications ({alerts.length})</span>
                <Badge variant="cyan">REALTIME</Badge>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {alerts.slice(0, 4).map(alt => (
                  <div
                    key={alt.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-rose-400 font-bold">
                      <span>{alt.detectionType}</span>
                      <span className="text-[10px] text-slate-400">{alt.timestamp.slice(11, 19)}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {alt.cameraName} • Dwell {alt.dwellDuration}s • Conf {Math.round(alt.confidence * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

