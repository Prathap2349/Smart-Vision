import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { Plus, Trash2, Shield, Settings, Sliders } from 'lucide-react';

export const ZoneCanvasEditor: React.FC = () => {
  const { zones, addZone, updateZone } = useSecurity();
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'zone-01');
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneType, setNewZoneType] = useState<'CORRIDOR' | 'ENTRY' | 'RESTRICTED' | 'TRIPWIRE'>('CORRIDOR');
  const [newDwell, setNewDwell] = useState<number>(20);

  const activeZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName) return;

    addZone({
      name: newZoneName,
      type: newZoneType,
      dwellThreshold: newDwell,
      enabled: true,
      color: newZoneType === 'RESTRICTED' ? '#ef4444' : newZoneType === 'ENTRY' ? '#f59e0b' : '#00f0ff',
      cameraName: 'Residential Corridor',
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Canvas Preview Area */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-0 overflow-hidden relative">
          <div className="relative w-full aspect-video bg-[#090d16] flex items-center justify-center border border-slate-800">
            {/* Visual Canvas Representation */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Render All Configured Zones */}
              {zones.map(z => (
                <g key={z.id} className="cursor-pointer" onClick={() => setSelectedZoneId(z.id)}>
                  <polygon
                    points={z.polygonPoints.map(p => `${p.x * 6.5},${p.y * 3.65}`).join(' ')}
                    fill={`${z.color}${selectedZoneId === z.id ? '40' : '15'}`}
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
                    fontFamily="monospace"
                  >
                    {z.name} ({z.dwellThreshold}s)
                  </text>
                </g>
              ))}
            </svg>

            <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300">
              [ROI CANVAS EDITOR] Click zone to select & edit parameters
            </div>
          </div>
        </Card>

        {/* Visual Explanation Banner */}
        <div className="p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-slate-300 flex items-start gap-3">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-cyan-200">How Detection Zones Work:</p>
            <p className="text-slate-400 mt-0.5">
              An alert is triggered only when an unknown human subject remains inside the configured zone longer than the dwell threshold (default <span className="text-cyan-300 font-bold">20 seconds</span>). Known whitelisted residents automatically bypass alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls Panel */}
      <div className="space-y-6">
        {/* Active Zone Parameter Editor */}
        {activeZone && (
          <Card className="space-y-4 border-cyan-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Active Zone Parameters
              </h3>
              <Badge variant="cyan">{activeZone.type}</Badge>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Zone Name</label>
              <input
                type="text"
                value={activeZone.name}
                onChange={e => updateZone(activeZone.id, { name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-400">
                  Dwell Time Threshold (Seconds)
                </label>
                <span className="text-xs font-bold text-cyan-400">{activeZone.dwellThreshold}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={activeZone.dwellThreshold}
                onChange={e => updateZone(activeZone.id, { dwellThreshold: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default recommendation: 20 seconds</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-300">Zone Enabled State</span>
              <Switch
                checked={activeZone.enabled}
                onChange={checked => updateZone(activeZone.id, { enabled: checked })}
              />
            </div>
          </Card>
        )}

        {/* Add New Zone Form */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Add New Detection Zone
          </h3>
          <form onSubmit={handleCreateZone} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="e.g. Back Garden Tripwire"
                value={newZoneName}
                onChange={e => setNewZoneName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={newZoneType}
                  onChange={e => setNewZoneType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none"
                >
                  <option value="CORRIDOR">CORRIDOR</option>
                  <option value="ENTRY">ENTRY</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="TRIPWIRE">TRIPWIRE</option>
                </select>
              </div>

              <div>
                <input
                  type="number"
                  value={newDwell}
                  onChange={e => setNewDwell(Number(e.target.value))}
                  placeholder="Dwell (sec)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20"
            >
              Create Zone &amp; Draw ROI
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
};
