import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityAlert } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
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
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { alerts, confirmAlertThreat, resolveAlert, setFeedbackModalAlert } = useSecurity();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedAlertDrawer, setSelectedAlertDrawer] = useState<SecurityAlert | null>(null);

  const filteredAlerts = alerts.filter((alt) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CRITICAL') return alt.severity === 'CRITICAL';
    if (activeFilter === 'HIGH') return alt.severity === 'HIGH';
    if (activeFilter === 'RESOLVED') return alt.status === 'RESOLVED';
    if (activeFilter === 'FALSE_POSITIVE') return alt.status === 'FALSE_POSITIVE';
    return true;
  });

  const filterCounts = {
    ALL: alerts.length,
    CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter((a) => a.severity === 'HIGH').length,
    RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length,
    FALSE_POSITIVE: alerts.filter((a) => a.status === 'FALSE_POSITIVE').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Security Incidents &amp; Alerts"
        subtitle="Real-time alert dispatch log with automated Telegram push and 3-Gate AI decision auditing"
        icon={<Bell className="w-5 h-5 text-amber-400" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge
              variant={filterCounts.CRITICAL > 0 ? 'danger' : 'success'}
              pulse={filterCounts.CRITICAL > 0}
              label={`${filterCounts.CRITICAL} Active Critical`}
            />
          </div>
        }
      />

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#0d1424] border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Filter Log:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'CRITICAL', 'HIGH', 'RESOLVED', 'FALSE_POSITIVE'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const count = filterCounts[filter];
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{filter.replace('_', ' ')}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            title="No Security Incidents Found"
            description={`No alerts matching the filter "${activeFilter.replace('_', ' ')}".`}
            icon={<Bell className="w-8 h-8 text-slate-600" />}
          />
        ) : (
          filteredAlerts.map((alt) => {
            const isCritical = alt.severity === 'CRITICAL' && alt.status === 'ACTIVE';
            return (
              <Card
                key={alt.id}
                className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-slate-700 ${
                  isCritical ? 'border-rose-500/50 bg-rose-950/10' : ''
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      variant={
                        alt.status === 'RESOLVED'
                          ? 'success'
                          : alt.status === 'FALSE_POSITIVE'
                          ? 'warning'
                          : alt.severity === 'CRITICAL'
                          ? 'danger'
                          : 'warning'
                      }
                      pulse={alt.status === 'ACTIVE'}
                      label={alt.status === 'ACTIVE' ? alt.severity : alt.status.replace('_', ' ')}
                    />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {alt.detectionType}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">({alt.id})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                    <span>
                      Camera: <strong className="text-slate-200">{alt.cameraName}</strong>
                    </span>
                    <span>
                      Track ID: <strong className="text-blue-400">{alt.personTrackId}</strong>
                    </span>
                    <span>
                      Dwell: <strong className="text-amber-400">{alt.dwellDuration}s</strong>
                    </span>
                    <span>
                      Biometrics:{' '}
                      <strong
                        className={
                          alt.faceStatus === 'UNKNOWN' ? 'text-rose-400' : 'text-emerald-400'
                        }
                      >
                        {alt.faceStatus}
                      </strong>
                    </span>
                    <span>
                      Confidence:{' '}
                      <strong className="text-slate-200">
                        {Math.round(alt.confidence * 100)}%
                      </strong>
                    </span>
                    <span>
                      Time:{' '}
                      <strong className="text-slate-200">
                        {alt.timestamp.slice(11, 19)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <button
                    onClick={() => setSelectedAlertDrawer(alt)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" /> View Evidence
                  </button>

                  {alt.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => setFeedbackModalAlert(alt)}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/50 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> False Positive?
                      </button>

                      <button
                        onClick={() => resolveAlert(alt.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Resolve
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })
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
            {/* Evidence Snapshot Frame */}
            <div className="relative aspect-video bg-[#070a12] border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
              <div className="absolute top-3 left-3 bg-rose-950/90 border border-rose-500/40 text-rose-300 px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-lg">
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
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-white">Telegram Alert Notification</p>
                  <p className="text-slate-400 text-[11px] font-mono">
                    Channel: Resident Mobile Bot • Latency:{' '}
                    <span className="text-blue-300 font-bold">
                      {selectedAlertDrawer.telegramLatency || 1.3}s
                    </span>
                  </p>
                </div>
              </div>
              <StatusBadge variant="info" label="DELIVERED" />
            </div>

            {/* AI Reasoning 3-Gate Audit */}
            <Card className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                AI Decision Engine Logic Breakdown
              </h4>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300">
                  <span>Gate 1: Semantic Human Detected</span>
                  <span className="font-bold">✓ PASS (YOLOv8-Nano 97%)</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300">
                  <span>Gate 2: Loitering Dwell &gt; 20s Threshold</span>
                  <span className="font-bold">✓ PASS ({selectedAlertDrawer.dwellDuration}s)</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300">
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
                className="px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 transition"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => {
                  confirmAlertThreat(selectedAlertDrawer.id);
                  setSelectedAlertDrawer(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/20"
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
