import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Cpu, Server, Activity, Thermometer, Zap, CheckCircle2, ArrowRight, ShieldCheck, Send } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const { metrics } = useSecurity();

  const pipelineNodes = [
    { name: 'CCTV Camera', status: metrics.rtspStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE', icon: '📷', sub: '1080p @ 10 FPS RTSP' },
    { name: 'OpenCV Pre-process', status: metrics.openCvStatus, icon: '🖼️', sub: 'Frame Buffer & ROI Crop' },
    { name: 'YOLOv8-Nano', status: metrics.yoloStatus, icon: '🧠', sub: 'Semantic Human Detection' },
    { name: 'ByteTrack Engine', status: metrics.byteTrackStatus, icon: '🎯', sub: 'Multi-Object Dwell Tracking' },
    { name: 'InsightFace Bio', status: metrics.insightFaceStatus, icon: '👤', sub: '512-d Resident Matching' },
    { name: 'Decision Engine', status: 'ACTIVE', icon: '⚖️', sub: '3-Gate Rule Evaluation' },
    { name: 'Telegram Bot API', status: metrics.telegramStatus === 'CONNECTED' ? 'ACTIVE' : 'OFFLINE', icon: '📲', sub: '<2.0s Alert Delivery' },
  ];

  return (
    <div className="space-y-6">
      {/* Edge Hardware Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>CPU Utilization</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.cpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${metrics.cpuUsage}%` }} />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Quad-core Edge ARM/x86</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>GPU Tensor Acceleration</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.gpuUsage}%</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${metrics.gpuUsage}%` }} />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">INT8 TensorRT Acceleration</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>RAM Allocation</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.ramUsageGb} GB / {metrics.ramTotalGb} GB</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${(metrics.ramUsageGb / metrics.ramTotalGb) * 100}%` }} />
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Unified Memory Buffer</span>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>SoC Temperature</span>
            <Thermometer className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.tempCelsius}°C</p>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(metrics.tempCelsius / 85) * 100}%` }} />
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Thermal State: NOMINAL (&lt;65°C)</span>
        </Card>
      </div>

      {/* Latency & FPS Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#0d1424] border border-slate-800 rounded-xl text-xs font-mono">
        <div>
          <span className="text-slate-400">Processing Speed:</span>
          <p className="text-lg font-bold text-cyan-400">{metrics.fps} FPS</p>
        </div>
        <div>
          <span className="text-slate-400">Inference Latency:</span>
          <p className="text-lg font-bold text-emerald-400">{metrics.inferenceLatencyMs} ms</p>
        </div>
        <div>
          <span className="text-slate-400">Network Latency:</span>
          <p className="text-lg font-bold text-slate-200">{metrics.networkLatencyMs} ms</p>
        </div>
        <div>
          <span className="text-slate-400">Frame Queue Size:</span>
          <p className="text-lg font-bold text-slate-200">{metrics.queueSize} Frames</p>
        </div>
      </div>

      {/* Visual Edge AI Pipeline Graph Diagram */}
      <Card className="space-y-4 border-cyan-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> AI Pipeline Node Topology
          </h3>
          <Badge variant="cyan">EDGE GRAPH</Badge>
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
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{node.sub}</p>
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
