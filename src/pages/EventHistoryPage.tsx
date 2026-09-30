import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, Download, Filter, Calendar, History, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const EventHistoryPage: React.FC = () => {
  const { events } = useSecurity();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    const matchesQuery =
      evt.trackId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.camera.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.eventType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedEventType === 'ALL' ||
      evt.eventType.toLowerCase().includes(selectedEventType.toLowerCase());

    return matchesQuery && matchesType;
  });

  const exportCSV = () => {
    const headers = 'ID,Timestamp,Camera,TrackID,PersonType,EventType,Confidence,Severity,Status\n';
    const rows = events
      .map(
        (e) =>
          `${e.id},${e.timestamp},"${e.camera}",${e.trackId},"${e.personType}","${e.eventType}",${e.confidence},${e.severity},"${e.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SVS_Security_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Event Audit Trail &amp; History"
        subtitle="Immutable timestamped log of all detections, recognition decisions, and security alerts"
        icon={<History className="w-5 h-5 text-blue-400" />}
        action={
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-400" /> Export CSV Audit Log
          </button>
        }
      />

      {/* Search & Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#0d1424] border border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search track ID, camera, or event keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-[#080d1a] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="Threat">Threat Verified</option>
              <option value="Loitering">Loitering Detected</option>
              <option value="Resident">Resident Recognized</option>
              <option value="Human">Human Detected</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing <strong className="text-white">{filteredEvents.length}</strong> of{' '}
          <strong className="text-slate-200">{events.length}</strong> events
        </span>
      </div>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No Matching Audit Events"
          description="Try adjusting your search query or event type filter."
          icon={<History className="w-8 h-8 text-slate-600" />}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#080d1a] border-b border-slate-800/80 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Camera</th>
                  <th className="p-3.5">Track ID</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3.5 text-slate-300">
                      {evt.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="p-3.5 font-bold text-white">{evt.camera}</td>
                    <td className="p-3.5 text-blue-400 font-bold">{evt.trackId}</td>
                    <td className="p-3.5 text-slate-300">{evt.personType}</td>
                    <td className="p-3.5">
                      <span
                        className={
                          evt.eventType.includes('Threat')
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-200'
                        }
                      >
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {Math.round(evt.confidence * 100)}%
                    </td>
                    <td className="p-3.5">
                      <StatusBadge
                        variant={
                          evt.severity === 'CRITICAL'
                            ? 'danger'
                            : evt.severity === 'WARNING'
                            ? 'warning'
                            : 'info'
                        }
                        label={evt.severity}
                      />
                    </td>
                    <td className="p-3.5 text-emerald-400 font-semibold">{evt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
