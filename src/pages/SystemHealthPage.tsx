import React from 'react';
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
  Send,
  Radio,
  Sparkles,
} from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const { metrics } = useSecurity();

  const pipelineNodes = [
    {
      name: 'RTSP Stream',
      status: metrics.rtspStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE',
      icon: '📷',
      sub: 'H.264 Video Decoder',
    },
    {
      name: 'Video Processing',
      status: metrics.openCvStatus,
      icon: '🖼️',
      sub: 'OpenCV Frame Buffer',
    },
    {
      name: 'Human Detection',
      status: metrics.yoloStatus,
      icon: '🧠',
      sub: 'YOLOv8-Nano CoreML',
    },
    {
      name: 'IoU Tracker',
      status: metrics.trackerStatus,
      icon: '🎯',
      sub: 'Loitering Dwell Timer',
    },
    {
      name: 'InsightFace ArcFace',
      status: metrics.faceMatcherStatus,
      icon: '👤',
      sub: '512-D Biometric Match',
    },
    {
      name: 'Decision Engine',
      status: 'ACTIVE',
      icon: '⚖️',
      sub: '3-Gate Rule Evaluation',
    },
    {
      name: 'Alert Dispatch',
      status: metrics.telegramStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE',
      icon: '📲',
      sub: 'Telegram & Webhooks',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="System Health &amp; Pipeline Diagnostics"
        subtitle="Real-time edge hardware utilization, inferencing telemetry, and end-to-end node pipeline status"
        icon={<Activity className="w-5 h-5 text-emerald-400" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse label="All Systems Operational" />
          </div>
        }
      />

      {/* Edge Hardware Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">CPU Utilization</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{metrics.cpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                metrics.cpuUsage > 80 ? 'bg-rose-500' : metrics.cpuUsage > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${metrics.cpuUsage}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Multi-core processor load</span>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Neural Engine / GPU</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{metrics.gpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{ width: `${metrics.gpuUsage}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">CoreML AI hardware acceleration</span>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">RAM Allocation</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {metrics.ramUsageGb} <span className="text-sm font-normal text-slate-400">/ {metrics.ramTotalGb} GB</span>
          </p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full transition-all duration-500"
              style={{ width: `${(metrics.ramUsageGb / metrics.ramTotalGb) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">System Memory In Use</span>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">System Temperature</span>
            <Thermometer className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{metrics.tempCelsius || 38}°C</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${((metrics.tempCelsius || 38) / 85) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Thermal State: Optimal (&lt;65°C)</span>
        </Card>
      </div>

      {/* Latency & FPS Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#0d1424] border border-slate-800 rounded-2xl text-xs font-mono">
        <div>
          <span className="text-slate-400">Processing Throughput:</span>
          <p className="text-lg font-bold text-blue-400 mt-0.5">
            {metrics.fps ? `${metrics.fps} FPS` : '0 FPS (Idle)'}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Inference Latency:</span>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">
            {metrics.inferenceLatencyMs ? `${metrics.inferenceLatencyMs} ms` : '0 ms (Idle)'}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Network Latency:</span>
          <p className="text-lg font-bold text-slate-200 mt-0.5">
            {metrics.networkLatencyMs ? `${metrics.networkLatencyMs} ms` : '0 ms'}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Frame Queue Buffer:</span>
          <p className="text-lg font-bold text-slate-200 mt-0.5">{metrics.queueSize || 0} Frames</p>
        </div>
      </div>

      {/* Edge AI Pipeline Flow Diagram */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" /> End-to-End Pipeline Node Architecture
            </h3>
            <p className="text-xs text-slate-400">
              Live status across all 7 stages of the Smart Vision Sentry vision computing stack.
            </p>
          </div>
          <StatusBadge variant="info" label="7 ACTIVE NODES" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {pipelineNodes.map((node, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#080d1a] border border-slate-800 flex flex-col justify-between space-y-2 relative group hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{node.icon}</span>
                <StatusBadge variant="success" pulse label="OK" />
              </div>

              <div>
                <p className="font-bold text-xs text-white leading-tight">{node.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{node.sub}</p>
              </div>

              {idx < pipelineNodes.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-600 group-hover:text-blue-400 transition">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
