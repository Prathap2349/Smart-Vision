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
  Activity,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LiveMonitorPage: React.FC = () => {
  const { overlayToggles, setOverlayToggles, cameras, simulatedPerson } = useSecurity();
  const [selectedCamId, setSelectedCamId] = useState<string>(cameras[0]?.id || 'cam-01');

  const activeCam = cameras.find((c) => c.id === selectedCamId) || cameras[0] || {
    id: 'cam-01',
    name: 'Front Door',
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
        title="Live Camera Monitor"
        subtitle="Live high-definition video with smart movement tracking and recognition"
        icon={<Camera className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="info" label="Smart Detection Active" />
            <StatusBadge variant="success" label="Live Stream" />
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cam.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Grid: Video Viewport (8 Cols) + Decision Engine (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Live Stream Canvas & AI Overlay Switches */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-950">
            <CCTVCanvasPlayer cameraId={activeCam.id} />
          </div>

          {/* AI Stream Overlay Controls */}
          <Card className="space-y-3 bg-white border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Visual Video Overlays
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Customize live camera metadata
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">Person Outlines</span>
                <Switch
                  checked={overlayToggles.boundingBoxes}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, boundingBoxes: checked }))
                  }
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">Subject Tags</span>
                <Switch
                  checked={overlayToggles.trackIds}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, trackIds: checked }))
                  }
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">Protected Zones</span>
                <Switch
                  checked={overlayToggles.zones}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, zones: checked }))
                  }
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">Family Match</span>
                <Switch
                  checked={overlayToggles.faceRecognition}
                  onChange={(checked) =>
                    setOverlayToggles((prev) => ({ ...prev, faceRecognition: checked }))
                  }
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">Detection Score</span>
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
          <Card className="space-y-3 bg-white border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Subject Details
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
                label={simulatedPerson.trackId ? `Person ${simulatedPerson.trackId}` : 'Standby'}
              />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Detected Object:</span>
                <span className="text-slate-900 font-bold">Human presence</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Recognition Confidence:</span>
                <span className="text-blue-600 font-bold">
                  {Math.round(simulatedPerson.confidence * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Duration in View:</span>
                <span className="text-amber-600 font-bold">
                  {simulatedPerson.dwellSeconds} seconds
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Identity:</span>
                <span
                  className={
                    simulatedPerson.faceStatus === 'UNKNOWN'
                      ? 'text-rose-600 font-bold'
                      : simulatedPerson.faceStatus === 'VERIFIED_RESIDENT'
                      ? 'text-emerald-600 font-bold'
                      : 'text-slate-500'
                  }
                >
                  {simulatedPerson.residentName || (simulatedPerson.faceStatus === 'UNKNOWN' ? 'Unrecognized visitor' : 'Searching...')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Location In Frame:</span>
                <span className="text-slate-700 font-medium">
                  Center zone
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
