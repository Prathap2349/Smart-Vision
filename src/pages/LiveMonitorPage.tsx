import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { CCTVCanvasPlayer } from '../components/common/CCTVCanvasPlayer';
import { DecisionPipelineWidget } from '../components/common/DecisionPipelineWidget';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Sliders, Camera, Eye, Shield, Activity, RefreshCw } from 'lucide-react';

export const LiveMonitorPage: React.FC = () => {
  const { overlayToggles, setOverlayToggles, cameras, simulatedPerson, isSimulating } = useSecurity();

  const activeCam = cameras[0] || {
    name: 'Residential Corridor',
    resolution: '1920x1080',
    fps: 10.2,
    streamType: 'RTSP',
    latency: 1.4,
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Stream Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0d1424] border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {activeCam.name}
              <Badge variant="emerald" pulse>RTSP LIVE</Badge>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {activeCam.resolution} @ {activeCam.fps} FPS • H.264 Stream • Latency {activeCam.latency}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="cyan" pulse>YOLOv8 + ByteTrack + InsightFace ACTIVE</Badge>
        </div>
      </div>

      {/* Main Grid: Video Player + AI Decision Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Video Feed & Interactive Toggles */}
        <div className="lg:col-span-8 space-y-4">
          <CCTVCanvasPlayer />

          {/* Interactive AI Overlay Toggle Controls */}
          <Card className="border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> AI Video Stream Overlays
              </h3>
              <span className="text-[11px] font-mono text-slate-400">Toggle real-time metadata overlays</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-1">
              <Switch
                label="Bounding Boxes"
                checked={overlayToggles.boundingBoxes}
                onChange={checked => setOverlayToggles(prev => ({ ...prev, boundingBoxes: checked }))}
              />
              <Switch
                label="Track IDs"
                checked={overlayToggles.trackIds}
                onChange={checked => setOverlayToggles(prev => ({ ...prev, trackIds: checked }))}
              />
              <Switch
                label="Detection Zones"
                checked={overlayToggles.zones}
                onChange={checked => setOverlayToggles(prev => ({ ...prev, zones: checked }))}
              />
              <Switch
                label="Face Match Tags"
                checked={overlayToggles.faceRecognition}
                onChange={checked => setOverlayToggles(prev => ({ ...prev, faceRecognition: checked }))}
              />
              <Switch
                label="AI Confidence Labels"
                checked={overlayToggles.aiLabels}
                onChange={checked => setOverlayToggles(prev => ({ ...prev, aiLabels: checked }))}
              />
            </div>
          </Card>
        </div>

        {/* Right 4 Cols: Live 3-Gate AI Decision Pipeline */}
        <div className="lg:col-span-4 space-y-6">
          <DecisionPipelineWidget />

          {/* Live Subject Telemetry Drawer */}
          <Card className="space-y-3 border-cyan-500/20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Active Subject Telemetry
              </h3>
              <Badge variant={simulatedPerson.faceStatus === 'UNKNOWN' ? 'rose' : 'emerald'}>
                {simulatedPerson.trackId}
              </Badge>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Semantic Class:</span>
                <span className="text-white font-bold">HUMAN (YOLOv8-Nano)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Detection Confidence:</span>
                <span className="text-cyan-400 font-bold">{Math.round(simulatedPerson.confidence * 100)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ByteTrack Dwell Timer:</span>
                <span className="text-amber-400 font-bold">{simulatedPerson.dwellSeconds} Seconds</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Biometric Match:</span>
                <span className={simulatedPerson.faceStatus === 'UNKNOWN' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {simulatedPerson.faceStatus}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Corridor Position (X,Y):</span>
                <span className="text-slate-200">
                  {Math.round(simulatedPerson.x)}%, {Math.round(simulatedPerson.y)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
