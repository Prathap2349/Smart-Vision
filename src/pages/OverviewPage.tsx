import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatStrip, StatItem } from '../components/ui/StatStrip';
import { CCTVCanvasPlayer } from '../components/common/CCTVCanvasPlayer';
import { DecisionPipelineWidget } from '../components/common/DecisionPipelineWidget';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  Camera,
  Users,
  Activity,
  Clock,
  Cpu,
  Server,
  Bell,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';

interface OverviewPageProps {
  onNavigateTab?: (tab: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const {
    metrics,
    alerts,
    finalDecision,
    residents,
    unknownPersons,
    cameras,
    simulatedPerson,
    isRealCameraMode,
  } = useSecurity();

  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || 'cam-01');
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    api.getHealth().then((res) => {
      if (isMounted && res) {
        setHealthData(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
  const isThreat = finalDecision === 'VERIFIED_THREAT' || activeAlerts > 0;
  const onlineCamerasCount = cameras.filter(c => c.status === 'ONLINE').length;
  const totalPeopleDetected = residents.length + unknownPersons.length;

  const currentFps = metrics.fps || (healthData?.camera === 'CONNECTED' ? 30.5 : 30.1);
  const currentLatency = metrics.inferenceLatencyMs || 32.8;
  const currentCpu = metrics.cpuUsage || 30.6;
  const currentRam = metrics.ramUsageGb ? `${metrics.ramUsageGb} GB` : '1.3 GB';

  // Section 4: Unified Monitoring Strip
  const statItems: StatItem[] = [
    {
      id: 'status',
      label: 'SYSTEM STATUS',
      value: 'Online',
      subtext: 'Edge AI Armed',
      variant: 'emerald',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'cameras',
      label: 'CAMERAS',
      value: `${onlineCamerasCount} / ${cameras.length || 4}`,
      subtext: 'RTSP Active',
      variant: 'blue',
      icon: <Camera className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      id: 'people',
      label: 'PEOPLE',
      value: `${totalPeopleDetected}`,
      subtext: 'Detected Today',
      variant: 'blue',
      icon: <Users className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      id: 'events',
      label: 'EVENTS',
      value: `${alerts.length}`,
      subtext: `${activeAlerts} Active Threat`,
      variant: activeAlerts > 0 ? 'rose' : 'emerald',
      icon: <Bell className="w-3.5 h-3.5" />,
    },
    {
      id: 'fps',
      label: 'FPS',
      value: `${currentFps}`,
      subtext: 'Throughput',
      variant: 'emerald',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'latency',
      label: 'LATENCY',
      value: `${currentLatency} ms`,
      subtext: 'E2E Pipeline',
      variant: 'blue',
      icon: <Clock className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      id: 'cpu',
      label: 'CPU',
      value: `${currentCpu}%`,
      subtext: 'Hardware Load',
      variant: 'neutral',
      icon: <Cpu className="w-3.5 h-3.5 text-slate-400" />,
    },
    {
      id: 'ram',
      label: 'RAM',
      value: currentRam,
      subtext: 'Memory',
      variant: 'neutral',
      icon: <Server className="w-3.5 h-3.5 text-slate-400" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Unified Monitoring Strip */}
      <StatStrip items={statItems} />

      {/* 2. Main Command Center Grid: Primary Camera Workspace (8 cols) + Side Telemetry (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Monitoring Canvas & Camera Selector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Live Monitoring"
              subtitle={`Active Feed: ${cameras.find(c => c.id === selectedCameraId)?.name || 'Corridor Camera 01'}`}
              icon={<Eye className="w-4 h-4" />}
              badge={<StatusBadge status={isThreat ? 'THREAT' : 'ONLINE'} size="sm" />}
            />
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('live-monitor')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
              >
                Full Workspace <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Big Primary Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
            <CCTVCanvasPlayer cameraId={selectedCameraId} />
          </div>

          {/* Camera Selector Strip (Section 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cameras.map(cam => {
              const isSelected = cam.id === selectedCameraId;
              const isOnline = cam.status === 'ONLINE';

              return (
                <button
                  key={cam.id}
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500/80 shadow-md shadow-blue-500/10'
                      : 'bg-[#0b101d] border-slate-800/80 hover:border-slate-700 hover:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white font-mono">{cam.name}</span>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{cam.resolution}</span>
                    <span className="text-emerald-400 font-bold">{cam.fps} FPS</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1 truncate">
                    {cam.location}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Triple-Gate Decision Engine & Current Detections */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Decision Pipeline Widget */}
          <DecisionPipelineWidget />

          {/* Section 6: Current Detections */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Current Detections
              </h3>
              <span className="text-[10px] font-mono text-slate-400">REALTIME</span>
            </div>

            <div className="space-y-2">
              {simulatedPerson.active ? (
                <div className="p-3 rounded-lg bg-[#070b13] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {simulatedPerson.residentName || `Track ${simulatedPerson.trackId}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Camera 01 • Front Corridor
                      </p>
                    </div>
                    <StatusBadge
                      status={simulatedPerson.faceStatus === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN'}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
                    <div>Confidence: <span className="text-blue-400 font-bold">{Math.round(simulatedPerson.confidence * 100)}%</span></div>
                    <div>Dwell Time: <span className="text-amber-400 font-bold">{simulatedPerson.dwellSeconds}s</span></div>
                  </div>
                </div>
              ) : unknownPersons.length > 0 ? (
                unknownPersons.slice(0, 2).map(unk => (
                  <div key={unk.id} className="p-2.5 rounded-lg bg-[#070b13] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Track {unk.trackId}</span>
                      <StatusBadge status="UNKNOWN" size="sm" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{unk.camera}</span>
                      <span>Dwell {unk.dwellSeconds}s • Conf {Math.round(unk.confidence * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  Zone Clear — No active subjects in ROI
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Bottom Row: Recent Events Timeline (Section 7) & AI Recognition Status (Section 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 7: Recent Events Timeline */}
        <div className="lg:col-span-8">
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" /> Recent Security Events
              </h3>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('alerts')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  View All ({alerts.length}) →
                </button>
              )}
            </div>

            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No security events logged yet today.</p>
              ) : (
                alerts.slice(0, 4).map(alt => {
                  const isThreatEvent = alt.severity === 'CRITICAL' || alt.faceStatus === 'UNKNOWN';

                  return (
                    <div
                      key={alt.id}
                      className="p-3 rounded-lg bg-[#0a0f1d] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isThreatEvent ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{alt.detectionType}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {alt.cameraName} • Dwell {alt.dwellDuration}s • Conf {Math.round(alt.confidence * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto font-mono text-xs">
                        <span className="text-slate-400 text-[11px]">{alt.timestamp.slice(11, 19)}</span>
                        <StatusBadge
                          status={alt.status === 'ACTIVE' ? (isThreatEvent ? 'THREAT' : 'MONITORING') : alt.status}
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

        {/* Section 8: AI Recognition Status */}
        <div className="lg:col-span-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" /> AI Recognition Engine
              </h3>
              <StatusBadge status="ACTIVE" size="sm" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Engine:</span>
                <span className="text-white font-bold">{healthData?.face_recognition?.engine || 'InsightFace / ArcFace'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Model:</span>
                <span className="text-blue-400 font-bold">{healthData?.face_recognition?.model || 'buffalo_s (512-D)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Provider:</span>
                <span className="text-emerald-400 font-bold">{healthData?.face_recognition?.provider || 'CoreMLExecutionProvider'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Cached Residents:</span>
                <span className="text-white font-bold">{residents.length} Whitelisted</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Quality Filter:</span>
                <span className="text-slate-300">Passive Blur &amp; Res</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
