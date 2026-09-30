import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatStrip, StatItem } from '../components/ui/StatStrip';
import { CCTVCanvasPlayer } from '../components/common/CCTVCanvasPlayer';
import { DecisionPipelineWidget } from '../components/common/DecisionPipelineWidget';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  Users,
  Bell,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  Eye,
  UserCheck,
  UserX,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { api } from '../services/api';

interface OverviewPageProps {
  onNavigateTab?: (tab: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const {
    metrics,
    alerts,
    finalDecision,
    residents,
    unknownPersons,
    cameras,
    simulatedPerson,
  } = useSecurity();

  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || 'cam-01');
  const [greeting, setGreeting] = useState<string>('Good day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
  const isThreat = finalDecision === 'VERIFIED_THREAT' || activeAlerts > 0;
  const onlineCamerasCount = cameras.filter(c => c.status === 'ONLINE').length;
  const recognizedCount = residents.length;
  const activeCamera = cameras.find(c => c.id === selectedCameraId) || cameras[0] || {
    id: 'cam-01',
    name: 'Front Door',
    location: 'Main Entrance',
    status: 'ONLINE',
  };

  // 4 Simple At-a-Glance Summary Cards
  const summaryItems: StatItem[] = [
    {
      id: 'security',
      label: 'Security Status',
      value: isThreat ? 'Action Needed' : 'Secure',
      subtext: isThreat ? '1 active alert to review' : 'All clear around your home',
      variant: isThreat ? 'rose' : 'emerald',
      icon: isThreat ? <ShieldAlert className="w-6 h-6 text-rose-600" /> : <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      onClick: () => onNavigateTab && onNavigateTab('alerts'),
    },
    {
      id: 'cameras',
      label: 'Cameras',
      value: `${onlineCamerasCount} Cameras`,
      subtext: onlineCamerasCount === cameras.length ? 'All online and streaming' : `${cameras.length - onlineCamerasCount} camera offline`,
      variant: 'blue',
      icon: <Camera className="w-6 h-6 text-blue-600" />,
      onClick: () => onNavigateTab && onNavigateTab('cameras'),
    },
    {
      id: 'people',
      label: 'Household',
      value: `${recognizedCount} Registered`,
      subtext: `${residents.filter(r => r.lastDetected).length || 2} seen recently`,
      variant: 'purple',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      onClick: () => onNavigateTab && onNavigateTab('people'),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      value: `${activeAlerts} Alerts`,
      subtext: activeAlerts === 0 ? 'Nothing urgent right now' : 'Requires your attention',
      variant: activeAlerts > 0 ? 'amber' : 'emerald',
      icon: activeAlerts > 0 ? <Bell className="w-6 h-6 text-amber-600" /> : <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      onClick: () => onNavigateTab && onNavigateTab('alerts'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Consumer Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {user?.name ? user.name.split(' ')[0] : 'there'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
            {isThreat ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Something needs your attention near the {activeCamera.name}.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Your home is secure. No unusual activity detected.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusBadge
            variant={isThreat ? 'danger' : 'success'}
            label={isThreat ? 'Alert Active' : 'Protected'}
            pulse={isThreat}
          />
        </div>
      </div>

      {/* 2. At-a-Glance 4-Card Summary Strip */}
      <StatStrip items={summaryItems} />

      {/* 3. Main Dashboard Grid: Primary Live View (8 cols) + AI Reasoning / Activity (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live View & Camera Selector */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-0 overflow-hidden bg-white border-slate-200/80 shadow-xs">
            {/* Live Card Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {activeCamera.name}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">{activeCamera.location}</p>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('cameras')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition"
                >
                  All Cameras <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
              <CCTVCanvasPlayer cameraId={selectedCameraId} />
            </div>

            {/* Camera Quick Selector Pills */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Switch Camera View
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {cameras.map(cam => {
                  const isSelected = cam.id === selectedCameraId;
                  const isOnline = cam.status === 'ONLINE';

                  return (
                    <button
                      key={cam.id}
                      onClick={() => setSelectedCameraId(cam.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">{cam.name}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{cam.location}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: AI Explanation + People Detected Now */}
        <div className="lg:col-span-4 space-y-6">
          {/* Why This Alert? Consumer AI Widget */}
          <DecisionPipelineWidget />

          {/* People Detected Now */}
          <Card className="space-y-3 bg-white border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  People Detected Now
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Live sensor</span>
            </div>

            <div className="space-y-2.5">
              {simulatedPerson.active ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        simulatedPerson.faceStatus === 'UNKNOWN' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {simulatedPerson.residentName ? simulatedPerson.residentName[0] : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {simulatedPerson.residentName || 'Unrecognized Person'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {activeCamera.name} • {simulatedPerson.dwellSeconds}s near entrance
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      variant={simulatedPerson.faceStatus === 'UNKNOWN' ? 'danger' : 'success'}
                      label={simulatedPerson.faceStatus === 'UNKNOWN' ? 'Unknown' : 'Family'}
                      size="sm"
                    />
                  </div>
                </div>
              ) : unknownPersons.length > 0 ? (
                unknownPersons.slice(0, 2).map(unk => (
                  <div key={unk.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Unrecognized Person</p>
                      <p className="text-[11px] text-slate-500">{unk.camera} • {unk.dwellSeconds}s</p>
                    </div>
                    <StatusBadge variant="danger" label="Unknown" size="sm" />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                  Everything looks clear — no active motion.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Bottom Row: Recent Activity Timeline */}
      <Card className="space-y-3 bg-white border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h3>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View Full History ({alerts.length}) →
            </button>
          )}
        </div>

        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No recent security activity logged today.</p>
          ) : (
            alerts.slice(0, 4).map(alt => {
              const isAlert = alt.severity === 'CRITICAL' || alt.status === 'ACTIVE';

              return (
                <div
                  key={alt.id}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isAlert ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isAlert ? <AlertTriangle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {alt.detectionType === 'Loitering Alert' || alt.detectionType === 'Security Alert'
                          ? `Unfamiliar person remained near ${alt.cameraName}`
                          : alt.detectionType}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {alt.cameraName} • Stayed {alt.dwellDuration} seconds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                    <span className="text-slate-400 text-xs">{alt.timestamp.slice(11, 16)}</span>
                    <StatusBadge
                      variant={alt.status === 'RESOLVED' ? 'success' : isAlert ? 'danger' : 'neutral'}
                      label={alt.status === 'RESOLVED' ? 'Resolved' : isAlert ? 'Needs Review' : 'Logged'}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
