import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { CCTVCanvasPlayer } from '../components/common/CCTVCanvasPlayer';
import { DecisionPipelineWidget } from '../components/common/DecisionPipelineWidget';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Switch } from '../components/ui/Switch';
import {
  Sliders,
  Camera,
  Eye,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

export const LiveMonitorPage: React.FC = () => {
  const { overlayToggles, setOverlayToggles, cameras, simulatedPerson, finalDecision } = useSecurity();
  const [selectedCamId, setSelectedCamId] = useState<string>(cameras[0]?.id || 'cam-01');

  const activeCam = cameras.find((c) => c.id === selectedCamId) || cameras[0] || {
    id: 'cam-01',
    name: 'Residential Corridor',
    resolution: '1920x1080',
    fps: 10.2,
    streamType: 'RTSP',
    latency: 1.4,
    status: 'ONLINE',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SectionHeader
        title="Live Surveillance Monitor"
        subtitle="Real-time RTSP video decoding with hardware-accelerated YOLOv8-Nano and biometric verification"
        icon={<Camera className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="info" pulse label="YOLOv8 + IoU + InsightFace" />
            <StatusBadge variant="success" pulse label={`${activeCam.fps} FPS ACTIVE`} />
          </div>
        }
      />

      {/* Camera Selection Bar if multiple cameras exist */}
      {cameras.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {cameras.map((cam) => {
            const isSelected = cam.id === selectedCamId;
            return (
              <button
                key={cam.id}
                onClick={() => setSelectedCamId(cam.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm'
                    : 'bg-[#0d1424] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cam.name}</span>
                <span className="font-mono text-[10px] opacity-75">{cam.resolution}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Grid: Video Viewport (8 Cols) + Decision Engine (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Live Stream Canvas & AI Overlay Switches */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#070a12] shadow-xl">
            <CCTVCanvasPlayer cameraId={activeCam.id} />
          </div>

          {/* AI Stream Overlay Controls */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Stream Overlays &amp; Visual HUD
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Toggle edge inference metadata layers
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Bounding Boxes</span>
                <Switch
                  checked={overlayToggles.boundingBoxes}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, boundingBoxes: checked }))
                  }
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Track IDs</span>
                <Switch
                  checked={overlayToggles.trackIds}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, trackIds: checked }))
                  }
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Detection Zones</span>
                <Switch
                  checked={overlayToggles.zones}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, zones: checked }))
                  }
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Face Match Tags</span>
                <Switch
                  checked={overlayToggles.faceRecognition}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, faceRecognition: checked }))
                  }
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Confidence HUD</span>
                <Switch
                  checked={overlayToggles.aiLabels}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, aiLabels: checked }))
                  }
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right 4 Cols: Triple-Gate Decision Engine & Live Telemetry */}
        <div className="lg:col-span-4 space-y-4">
          <DecisionPipelineWidget />

          {/* Active Subject Telemetry */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Subject Telemetry
                </h3>
              </div>
              <StatusBadge
                variant={
                  simulatedPerson.faceStatus === 'UNKNOWN'
                    ? 'danger'
                    : simulatedPerson.faceStatus === 'VERIFIED_RESIDENT'
                    ? 'success'
                    : 'neutral'
                }
                label={simulatedPerson.trackId ? `Track ${simulatedPerson.trackId}` : 'IDLE'}
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Classification:</span>
                <span className="text-white font-bold">HUMAN (YOLOv8-Nano)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Detection Confidence:</span>
                <span className="text-blue-400 font-bold">
                  {Math.round(simulatedPerson.confidence * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">IoU Dwell Duration:</span>
                <span className="text-amber-400 font-bold">
                  {simulatedPerson.dwellSeconds}s / 20s Threshold
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Biometric Status:</span>
                <span
                  className={
                    simulatedPerson.faceStatus === 'UNKNOWN'
                      ? 'text-rose-400 font-bold'
                      : simulatedPerson.faceStatus === 'VERIFIED_RESIDENT'
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }
                >
                  {simulatedPerson.faceStatus || 'SEARCHING'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Zone Position:</span>
                <span className="text-slate-200">
                  X: {Math.round(simulatedPerson.x)}% | Y: {Math.round(simulatedPerson.y)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
