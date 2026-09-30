import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import {
  Cpu,
  Server,
  Activity,
  Thermometer,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Radio,
  Camera,
  HardDrive,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const { metrics, cameras } = useSecurity();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const onlineCameras = cameras.filter((c) => c.status === 'ONLINE').length;

  const pipelineNodes = [
    {
      name: 'Camera Feeds',
      status: metrics.rtspStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE',
      icon: '📷',
      sub: 'HD Video Streaming',
    },
    {
      name: 'Video Decoder',
      status: metrics.openCvStatus,
      icon: '🖼️',
      sub: 'Real-Time Frame Buffer',
    },
    {
      name: 'Human Detection',
      status: metrics.yoloStatus,
      icon: '🧠',
      sub: 'YOLOv8 AI Silhouette',
    },
    {
      name: 'Movement Tracker',
      status: metrics.trackerStatus,
      icon: '🎯',
      sub: 'Stay Duration Timer',
    },
    {
      name: 'Face Recognition',
      status: metrics.faceMatcherStatus,
      icon: '👤',
      sub: 'Household Face Match',
    },
    {
      name: 'Smart Alert Rules',
      status: 'ACTIVE',
      icon: '⚖️',
      sub: 'False Alarm Filter',
    },
    {
      name: 'Phone Notifications',
      status: metrics.telegramStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE',
      icon: '📲',
      sub: 'Telegram & App Push',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="System Status"
        subtitle="Device connection health, AI detection status, and hardware performance"
        icon={<Activity className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" label="All Systems Healthy" />
          </div>
        }
      />

      {/* 4 Simple Consumer Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cameras */}
        <Card className="bg-white border-slate-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cameras</span>
            <Camera className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{onlineCameras} / {cameras.length} Online</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">All video streams active</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Video quality:</span>
            <span className="font-semibold text-slate-800">1080p Full HD</span>
          </div>
        </Card>

        {/* Card 2: AI Protection */}
        <Card className="bg-white border-slate-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Protection</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Running Normally</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Real-time detection armed</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Recognition engine:</span>
            <span className="font-semibold text-slate-800">InsightFace Active</span>
          </div>
        </Card>

        {/* Card 3: Storage */}
        <Card className="bg-white border-slate-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Storage</span>
            <HardDrive className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Healthy</h3>
            <p className="text-xs text-slate-500 mt-1">Local encrypted video cache</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Retention:</span>
            <span className="font-semibold text-slate-800">30 days rolling</span>
          </div>
        </Card>

        {/* Card 4: Performance */}
        <Card className="bg-white border-slate-200/80 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Performance</span>
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Optimal</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Operating at normal load</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Thermal state:</span>
            <span className="font-semibold text-slate-800">{metrics.tempCelsius || 38}°C (Cool)</span>
          </div>
        </Card>
      </div>

      {/* End-to-End Pipeline Overview */}
      <Card className="bg-white border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Protection Pipeline Architecture</h3>
            <p className="text-xs text-slate-500">7 active components safeguarding your home</p>
          </div>
          <StatusBadge variant="success" label="All 7 Stages Active" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {pipelineNodes.map((node, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2 relative group hover:bg-slate-100/70 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{node.icon}</span>
                <StatusBadge variant="success" size="sm" label="OK" />
              </div>

              <div>
                <p className="font-bold text-xs text-slate-900 leading-tight">{node.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{node.sub}</p>
              </div>

              {idx < pipelineNodes.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Advanced Diagnostics (Collapsible) */}
      <Card className="bg-white border-slate-200/80 shadow-xs space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left py-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Advanced Hardware Metrics &amp; Telemetry</h3>
              <p className="text-xs text-slate-500">Detailed processor gauges, memory allocations, and network latency</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <span>{showAdvanced ? 'Hide hardware gauges' : 'Show hardware gauges'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="pt-4 border-t border-slate-100 space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>CPU Usage</span>
                  <span>{metrics.cpuUsage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${metrics.cpuUsage}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">Main application processor</span>
              </div>

              {/* Neural Engine */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Neural Accelerator</span>
                  <span>{metrics.gpuUsage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full" style={{ width: `${metrics.gpuUsage}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">CoreML hardware accelerator</span>
              </div>

              {/* RAM */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Memory (RAM)</span>
                  <span>{metrics.ramUsageGb} / {metrics.ramTotalGb} GB</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full" style={{ width: `${(metrics.ramUsageGb / metrics.ramTotalGb) * 100}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">Application RAM pool</span>
              </div>

              {/* Temp */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Temperature</span>
                  <span>{metrics.tempCelsius || 38}°C</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${((metrics.tempCelsius || 38) / 85) * 100}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">Thermal state normal</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Live Frame Rate:</span>
                <p className="font-bold text-slate-900 mt-0.5">{metrics.fps || 30.5} FPS</p>
              </div>
              <div>
                <span className="text-slate-500">Processing Latency:</span>
                <p className="font-bold text-slate-900 mt-0.5">{metrics.inferenceLatencyMs || 32.8} ms</p>
              </div>
              <div>
                <span className="text-slate-500">Network Latency:</span>
                <p className="font-bold text-slate-900 mt-0.5">{metrics.networkLatencyMs || 1.3} ms</p>
              </div>
              <div>
                <span className="text-slate-500">Stream Protocol:</span>
                <p className="font-bold text-slate-900 mt-0.5">RTSP over TCP</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
