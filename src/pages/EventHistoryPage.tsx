import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Activity,
  Search,
  Download,
  Filter,
  Users,
  Bell,
  Camera,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const EventHistoryPage: React.FC = () => {
  const { events } = useSecurity();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PEOPLE' | 'ALERTS' | 'CAMERAS'>('ALL');

  const filteredEvents = events.filter((evt) => {
    const matchesQuery =
      evt.trackId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.camera.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.eventType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (selectedFilter === 'PEOPLE') {
      return evt.eventType.toLowerCase().includes('resident') || evt.eventType.toLowerCase().includes('human') || evt.eventType.toLowerCase().includes('face');
    }
    if (selectedFilter === 'ALERTS') {
      return evt.severity === 'CRITICAL' || evt.severity === 'WARNING' || evt.eventType.toLowerCase().includes('threat') || evt.eventType.toLowerCase().includes('loiter');
    }
    if (selectedFilter === 'CAMERAS') {
      return true;
    }

    return true;
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
    a.download = `Smart_Vision_Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Home Activity Timeline"
        subtitle="Chronological timeline of all motions, recognized family arrivals, and security notices"
        icon={<Activity className="w-5 h-5" />}
        action={
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-blue-600" /> Export Activity Log
          </button>
        }
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by camera, person, or activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: 'ALL', label: 'All Activity', icon: Activity },
              { key: 'PEOPLE', label: 'People', icon: Users },
              { key: 'ALERTS', label: 'Alerts', icon: Bell },
            ].map((f) => {
              const Icon = f.icon;
              const isActive = selectedFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedFilter(f.key as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{filteredEvents.length}</strong> events
        </span>
      </div>

      {/* Activity Timeline List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No Activity Found"
          description="No activity matching your search filter was recorded."
          icon={<Clock className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const isAlert = evt.severity === 'CRITICAL' || evt.eventType.includes('Threat');
            const isResident = evt.eventType.includes('Resident') || evt.personType === 'Known Resident';

            return (
              <Card
                key={evt.id}
                className="p-4 bg-white border-slate-200/80 shadow-xs hover:shadow-md transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isAlert
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : isResident
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}
                  >
                    {isAlert ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : isResident ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {isResident
                        ? `Recognized family member sighted at ${evt.camera}`
                        : isAlert
                        ? `Security notice near ${evt.camera}`
                        : evt.eventType}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {evt.camera} • {evt.personType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-slate-800">
                      {evt.timestamp.replace('T', ' ').slice(11, 16)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {evt.timestamp.slice(0, 10)}
                    </p>
                  </div>

                  <StatusBadge
                    variant={
                      evt.severity === 'CRITICAL'
                        ? 'danger'
                        : evt.severity === 'WARNING'
                        ? 'warning'
                        : 'info'
                    }
                    label={isAlert ? 'Alert' : isResident ? 'Safe' : 'Seen'}
                    size="sm"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
