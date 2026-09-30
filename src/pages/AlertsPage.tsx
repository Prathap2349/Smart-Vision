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
  Camera,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { alerts, confirmAlertThreat, resolveAlert, setFeedbackModalAlert } = useSecurity();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedAlertDrawer, setSelectedAlertDrawer] = useState<SecurityAlert | null>(null);

  const filteredAlerts = alerts.filter((alt) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return alt.status === 'ACTIVE';
    if (activeFilter === 'RESOLVED') return alt.status === 'RESOLVED';
    if (activeFilter === 'FALSE_POSITIVE') return alt.status === 'FALSE_POSITIVE';
    return true;
  });

  const filterCounts = {
    ALL: alerts.length,
    ACTIVE: alerts.filter((a) => a.status === 'ACTIVE').length,
    RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length,
    FALSE_POSITIVE: alerts.filter((a) => a.status === 'FALSE_POSITIVE').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Security Alerts"
        subtitle="Review motion detections, loitering notices, and household alerts"
        icon={<Bell className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge
              variant={filterCounts.ACTIVE > 0 ? 'danger' : 'success'}
              pulse={filterCounts.ACTIVE > 0}
              label={filterCounts.ACTIVE > 0 ? `${filterCounts.ACTIVE} Needs Attention` : 'All Resolved'}
            />
          </div>
        }
      />

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 px-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">
            Filter:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'ALL', label: 'All Alerts' },
            { key: 'ACTIVE', label: 'Needs Review' },
            { key: 'RESOLVED', label: 'Resolved' },
            { key: 'FALSE_POSITIVE', label: 'Marked Safe' },
          ].map((item) => {
            const isActive = activeFilter === item.key;
            const count = filterCounts[item.key as keyof typeof filterCounts];
            return (
              <button
                key={item.key}
                onClick={() => setActiveFilter(item.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
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
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            title="No Alerts Found"
            description={
              activeFilter === 'ACTIVE'
                ? 'Your home is all clear! There are no unresolved security alerts.'
                : 'No alerts found for this filter.'
            }
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
          />
        ) : (
          filteredAlerts.map((alt) => {
            const isCritical = alt.status === 'ACTIVE';

            return (
              <Card
                key={alt.id}
                className={`p-5 bg-white border transition hover:shadow-md ${
                  isCritical ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left Alert Description (WHAT, WHERE, WHEN, WHY) */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusBadge
                        variant={
                          alt.status === 'RESOLVED'
                            ? 'success'
                            : alt.status === 'FALSE_POSITIVE'
                            ? 'warning'
                            : 'danger'
                        }
                        pulse={alt.status === 'ACTIVE'}
                        label={alt.status === 'ACTIVE' ? 'Action Needed' : alt.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'}
                      />
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Unrecognized Person Detected
                      </h3>
                    </div>

                    <p className="text-sm text-slate-700">
                      An unfamiliar person remained near your <strong className="text-slate-900">{alt.cameraName}</strong> for{' '}
                      <strong className="text-slate-900">{alt.dwellDuration} seconds</strong>.
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Location: <strong className="text-slate-700">{alt.cameraName}</strong></span>
                      <span>Time: <strong className="text-slate-700">{alt.timestamp.replace('T', ' ').slice(0, 16)}</strong></span>
                      <span>Detection: <strong className="text-slate-700">{Math.round(alt.confidence * 100)}% clarity</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() => setSelectedAlertDrawer(alt)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" /> View Details
                    </button>

                    {alt.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => setFeedbackModalAlert(alt)}
                          className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition flex items-center gap-1.5"
                          title="Report as harmless"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> False Alarm?
                        </button>

                        <button
                          onClick={() => resolveAlert(alt.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                        </button>
                      </>
                    )}
                  </div>
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
        title="Alert Details &amp; Video Snapshot"
      >
        {selectedAlertDrawer && (
          <div className="space-y-6">
            {/* Snapshot Frame */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-md">
              <div className="absolute top-3 left-3 bg-rose-900/80 text-rose-200 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Security Snapshot
              </div>
              <div className="text-center space-y-2">
                <UserX className="w-12 h-12 text-rose-400 mx-auto" />
                <p className="text-xs text-slate-300">
                  {selectedAlertDrawer.cameraName} • Stayed {selectedAlertDrawer.dwellDuration} seconds
                </p>
              </div>
            </div>

            {/* Notification Status */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Notification Sent to Your Phone</p>
                  <p className="text-slate-500 mt-0.5">
                    Delivered via Telegram / App Push notification within 1.3 seconds.
                  </p>
                </div>
              </div>
              <StatusBadge variant="info" label="Delivered" />
            </div>

            {/* Plain English Explanation */}
            <Card className="space-y-3 bg-white border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Why was this alert generated?
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Human shape was clearly detected in protected camera area.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 font-medium">
                  <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Subject lingered for {selectedAlertDrawer.dwellDuration} seconds (longer than the 20s security rule).</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-100 font-medium">
                  <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Face does not match any enrolled household members.</span>
                </div>
              </div>
            </Card>

            {/* Action Buttons in Drawer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setFeedbackModalAlert(selectedAlertDrawer);
                  setSelectedAlertDrawer(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Mark False Alarm
              </button>
              <button
                onClick={() => {
                  confirmAlertThreat(selectedAlertDrawer.id);
                  setSelectedAlertDrawer(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs"
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
