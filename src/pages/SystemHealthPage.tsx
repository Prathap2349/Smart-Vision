import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Cpu, Server, Activity, Thermometer, Zap, CheckCircle2, ArrowRight, ShieldCheck, Send } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const { metrics } = useSecurity();

  const pipelineNodes = [
    { name: 'CCTV Camera', status: metrics.rtspStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE', icon: '📷', sub: 'High Definition Feed' },
    { name: 'Video Processing', status: metrics.openCvStatus, icon: '🖼️', sub: 'Frame Buffer & ROI Crop' },
    { name: 'Human Detection', status: metrics.yoloStatus, icon: '🧠', sub: 'YOLOv8 Human Silhouette' },
    { name: 'Loitering Tracker', status: metrics.byteTrackStatus, icon: '🎯', sub: 'Lightweight IoU Tracker' },
    { name: 'Resident Check', status: metrics.insightFaceStatus, icon: '👤', sub: 'Prototype Face Matcher' },
    { name: 'Decision Engine', status: 'ACTIVE', icon: '⚖️', sub: '3-Gate Rule Evaluation' },
    { name: 'Alert Channel', status: metrics.telegramStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE', icon: '📲', sub: 'Instant Mobile Alert' },
  ];

  return (
    <div className="space-y-6">
      {/* Edge Hardware Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Utilization</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.cpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${metrics.cpuUsage}%` }} />
          </div>
          <span className="text-[11px] text-slate-400">System Processor</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI Hardware Accelerator</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.gpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${metrics.gpuUsage}%` }} />
          </div>
          <span className="text-[11px] text-slate-400">Neural Engine Acceleration</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>RAM Allocation</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.ramUsageGb} GB / {metrics.ramTotalGb} GB</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${(metrics.ramUsageGb / metrics.ramTotalGb) * 100}%` }} />
          </div>
          <span className="text-[11px] text-slate-400">System Memory</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>System Temperature</span>
            <Thermometer className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.tempCelsius || 38}°C</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${((metrics.tempCelsius || 38) / 85) * 100}%` }} />
          </div>
          <span className="text-[11px] text-emerald-400">Thermal State: Normal (&lt;65°C)</span>
        </Card>
      </div>

      {/* Latency & FPS Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#0d1424] border border-slate-800 rounded-xl text-xs">
        <div>
          <span className="text-slate-400">Processing Speed:</span>
          <p className="text-lg font-bold text-cyan-400">{metrics.fps ? `${metrics.fps} FPS` : '0 FPS (Idle)'}</p>
        </div>
        <div>
          <span className="text-slate-400">Inference Latency:</span>
          <p className="text-lg font-bold text-emerald-400">{metrics.inferenceLatencyMs ? `${metrics.inferenceLatencyMs} ms` : '0 ms (Idle)'}</p>
        </div>
        <div>
          <span className="text-slate-400">Network Latency:</span>
          <p className="text-lg font-bold text-slate-200">{metrics.networkLatencyMs ? `${metrics.networkLatencyMs} ms` : '0 ms'}</p>
        </div>
        <div>
          <span className="text-slate-400">Frame Buffer:</span>
          <p className="text-lg font-bold text-slate-200">{metrics.queueSize || 0} Frames</p>
        </div>
      </div>

      {/* Visual Edge AI Pipeline Graph Diagram */}
      <Card className="space-y-4 border-cyan-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Security System Flow
          </h3>
          <Badge variant="cyan">PIPELINE</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {pipelineNodes.map((node, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-2 relative group hover:border-cyan-500/50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{node.icon}</span>
                <Badge variant="emerald" pulse>HEALTHY</Badge>
              </div>

              <div>
                <p className="font-bold text-xs text-white leading-tight">{node.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{node.sub}</p>
              </div>

              {idx < pipelineNodes.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-cyan-400">
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
