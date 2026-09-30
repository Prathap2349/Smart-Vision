import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { SectionHeader } from '../ui/SectionHeader';
import { Switch } from '../ui/Switch';
import { Plus, Trash2, Shield, Settings, Sliders, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

export const ZoneCanvasEditor: React.FC = () => {
  const { zones, addZone, updateZone } = useSecurity();
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'zone-01');
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneType, setNewZoneType] = useState<'CORRIDOR' | 'ENTRY' | 'RESTRICTED' | 'TRIPWIRE'>('CORRIDOR');
  const [newDwell, setNewDwell] = useState<number>(20);

  const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName) return;

    addZone({
      name: newZoneName,
      type: newZoneType,
      dwellThreshold: newDwell,
      enabled: true,
      color: newZoneType === 'RESTRICTED' ? '#ef4444' : newZoneType === 'ENTRY' ? '#f59e0b' : '#3b82f6',
      cameraName: 'Front Door',
      polygonPoints: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 },
      ],
    });

    setNewZoneName('');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Protected Areas &amp; Boundaries"
        subtitle="Draw custom boundary zones on your camera views and set specific stay duration rules"
        icon={<MapPin className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="info" label={`${zones.length} Protected Areas`} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Canvas Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden bg-white border-slate-200/80 shadow-xs">
            <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center">
              {/* Visual Canvas Representation */}
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Render All Configured Zones */}
                {zones.map((z) => (
                  <g key={z.id} className="cursor-pointer" onClick={() => setSelectedZoneId(z.id)}>
                    <polygon
                      points={z.polygonPoints.map((p) => `${p.x * 6.5},${p.y * 3.65}`).join(' ')}
                      fill={`${z.color}${selectedZoneId === z.id ? '50' : '20'}`}
                      stroke={z.color}
                      strokeWidth={selectedZoneId === z.id ? '3' : '1.5'}
                      strokeDasharray={z.type === 'TRIPWIRE' ? '6 4' : undefined}
                    />
                    {z.polygonPoints.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x * 6.5}
                        cy={p.y * 3.65}
                        r={selectedZoneId === z.id ? 6 : 4}
                        fill={z.color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}
                    <text
                      x={z.polygonPoints[0].x * 6.5 + 10}
                      y={z.polygonPoints[0].y * 3.65 + 20}
                      fill={z.color}
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {z.name} ({z.dwellThreshold}s)
                    </text>
                  </g>
                ))}
              </svg>

              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-md">
                Click a protected area to customize its stay threshold
              </div>
            </div>
          </Card>

          {/* Explanation Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-slate-700 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">How Protected Areas Work:</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Smart Vision only sends an alert when an unfamiliar person stays inside this boundary longer than your set duration (default: <strong className="text-slate-900">20 seconds</strong>). Recognized family members pass freely without causing false alarms.
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls Panel */}
        <div className="space-y-6">
          {/* Active Zone Parameter Editor */}
          {activeZone && (
            <Card className="space-y-4 bg-white border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" /> Boundary Settings
                </h3>
                <StatusBadge variant="info" label={activeZone.type} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  value={activeZone.name}
                  onChange={(e) => updateZone(activeZone.id, { name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Stay Duration Threshold
                  </label>
                  <span className="text-xs font-bold text-blue-600">{activeZone.dwellThreshold}s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={activeZone.dwellThreshold}
                  onChange={(e) =>
                    updateZone(activeZone.id, { dwellThreshold: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">Recommended duration: 20 seconds</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-700">Active Protection</span>
                <Switch
                  checked={activeZone.enabled}
                  onChange={(checked) => updateZone(activeZone.id, { enabled: checked })}
                />
              </div>
            </Card>
          )}

          {/* Add New Zone Form */}
          <Card className="space-y-4 bg-white border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Create New Boundary
            </h3>
            <form onSubmit={handleCreateZone} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="e.g. Backyard Patio Area"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:border-blue-500 focus:bg-white outline-none"
                  >
                    <option value="CORRIDOR">Entrance</option>
                    <option value="ENTRY">Doorstep</option>
                    <option value="RESTRICTED">Restricted</option>
                    <option value="TRIPWIRE">Boundary Line</option>
                  </select>
                </div>

                <div>
                  <input
                    type="number"
                    value={newDwell}
                    onChange={(e) => setNewDwell(Number(e.target.value))}
                    placeholder="Duration (s)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-xs"
              >
                Add Boundary
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
