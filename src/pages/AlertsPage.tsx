import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityAlert, AlertStatus, ThreatSeverity } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import {
  Bell,
  Eye,
  CheckCircle,
  AlertTriangle,
  Send,
  Clock,
  Shield,
  ThumbsDown,
  UserX,
  Filter,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { alerts, confirmAlertThreat, resolveAlert, setFeedbackModalAlert } = useSecurity();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedAlertDrawer, setSelectedAlertDrawer] = useState<SecurityAlert | null>(null);

  const filteredAlerts = alerts.filter(alt => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CRITICAL') return alt.severity === 'CRITICAL';
    if (activeFilter === 'HIGH') return alt.severity === 'HIGH';
    if (activeFilter === 'RESOLVED') return alt.status === 'RESOLVED';
    if (activeFilter === 'FALSE_POSITIVE') return alt.status === 'FALSE_POSITIVE';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0d1424] border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filter Incidents:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'RESOLVED', 'FALSE_POSITIVE'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === filter
                  ? 'bg-cyan-600 text-white shadow-cyan-glow'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Grid / Table */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="py-12 text-center text-slate-400 space-y-2">
            <Bell className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-semibold text-sm">No security alerts found for this filter.</p>
          </Card>
        ) : (
          filteredAlerts.map(alt => (
            <Card
              key={alt.id}
              glow={alt.severity === 'CRITICAL' && alt.status === 'ACTIVE' ? 'rose' : 'none'}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-cyan-500/40"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={alt.severity === 'CRITICAL' ? 'rose' : 'amber'} pulse={alt.status === 'ACTIVE'}>
                    {alt.severity}
                  </Badge>
                  <h3 className="text-base font-bold text-white tracking-tight">{alt.detectionType}</h3>
                  <span className="text-xs text-slate-400 font-mono">({alt.id})</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                  <span>Cam: <strong className="text-slate-200">{alt.cameraName}</strong></span>
                  <span>Track: <strong className="text-cyan-400">{alt.personTrackId}</strong></span>
                  <span>Dwell: <strong className="text-amber-400">{alt.dwellDuration}s</strong></span>
                  <span>Face: <strong className={alt.faceStatus === 'UNKNOWN' ? 'text-rose-400' : 'text-emerald-400'}>{alt.faceStatus}</strong></span>
                  <span>Conf: <strong className="text-slate-200">{Math.round(alt.confidence * 100)}%</strong></span>
                  <span>Time: <strong className="text-slate-200">{alt.timestamp.slice(11, 19)}</strong></span>
                </div>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                {alt.status === 'FALSE_POSITIVE' && (
                  <Badge variant="amber">FALSE POSITIVE</Badge>
                )}
                {alt.status === 'RESOLVED' && (
                  <Badge variant="emerald">RESOLVED</Badge>
                )}

                <button
                  onClick={() => setSelectedAlertDrawer(alt)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-cyan-300 hover:bg-cyan-950 hover:border-cyan-500 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Evidence
                </button>

                {alt.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => setFeedbackModalAlert(alt)}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> False Positive?
                    </button>

                    <button
                      onClick={() => resolveAlert(alt.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Incident Detail Slide-out Drawer */}
      <Drawer
        isOpen={!!selectedAlertDrawer}
        onClose={() => setSelectedAlertDrawer(null)}
        title={`Incident Evidence Audit — ${selectedAlertDrawer?.id}`}
      >
        {selectedAlertDrawer && (
          <div className="space-y-6">
            {/* Simulated Evidence Frame */}
            <div className="relative aspect-video bg-[#080c18] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              <div className="absolute top-3 left-3 bg-rose-950/90 border border-rose-500/50 text-rose-300 px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> EVIDENCE SNAPSHOT #{selectedAlertDrawer.id}
              </div>
              <div className="text-center space-y-2">
                <UserX className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                <p className="font-mono text-xs text-slate-300">
                  Track {selectedAlertDrawer.personTrackId} • Dwell {selectedAlertDrawer.dwellDuration}s • {selectedAlertDrawer.cameraName}
                </p>
              </div>
            </div>

            {/* Telegram Delivery Status Box */}
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white">Telegram Alert Delivered</p>
                  <p className="text-slate-400 text-[11px] font-mono">
                    Sent to Resident Channel • Delivery Latency: <span className="text-cyan-300 font-bold">{selectedAlertDrawer.telegramLatency || 1.3}s</span>
                  </p>
                </div>
              </div>
              <Badge variant="cyan">DELIVERED</Badge>
            </div>

            {/* AI Reasoning 3-Gate Audit */}
            <Card className="space-y-3 border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                AI Decision Engine Logic Breakdown
              </h4>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300">
                  <span>Gate 1: Semantic Human Detected</span>
                  <span className="font-bold">✓ PASS (YOLOv8-Nano 97%)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300">
                  <span>Gate 2: Loitering Dwell &gt; 20 Seconds</span>
                  <span className="font-bold">✓ PASS ({selectedAlertDrawer.dwellDuration}s)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900 border border-emerald-500/30 text-emerald-300">
                  <span>Gate 3: Face Whitelist Verification</span>
                  <span className="font-bold text-rose-400">✓ PASS (UNKNOWN SUBJECT)</span>
                </div>
              </div>
            </Card>

            {/* Action Buttons in Drawer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setFeedbackModalAlert(selectedAlertDrawer);
                  setSelectedAlertDrawer(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-900 transition"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => {
                  confirmAlertThreat(selectedAlertDrawer.id);
                  setSelectedAlertDrawer(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-rose-glow"
              >
                Confirm Security Threat
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
