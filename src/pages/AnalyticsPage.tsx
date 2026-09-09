import React from 'react';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { ArrowDownRight, Clock, ShieldCheck, Zap, Activity, BarChart2 } from 'lucide-react';

const beforeAfterData = [
  { metric: 'False Alarms / Day', before: 99, after: 3 },
  { metric: 'Daily Log Check (Mins)', before: 20, after: 1 },
];

const hourlyAlerts = [
  { hour: '00:00', alerts: 0 },
  { hour: '04:00', alerts: 0 },
  { hour: '08:00', alerts: 0 },
  { hour: '12:00', alerts: 1 },
  { hour: '16:00', alerts: 0 },
  { hour: '20:00', alerts: 1 },
];

const confidenceDist = [
  { range: '90-95%', count: 4 },
  { range: '95-98%', count: 11 },
  { range: '98-100%', count: 3 },
];

const latencyHist = [
  { second: '1.0s', count: 2 },
  { second: '1.2s', count: 5 },
  { second: '1.4s', count: 8 },
  { second: '1.6s', count: 2 },
  { second: '1.8s', count: 1 },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Detection Accuracy"
          value="98.6%"
          subtitle="Smart AI Model"
          statusText="High Precision"
          statusVariant="emerald"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          title="Resident Recognition"
          value="99.1%"
          subtitle="Face Matcher Engine"
          statusText="Zero False Hits"
          statusVariant="emerald"
          icon={<Zap className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          title="Avg Alert Latency"
          value="1.4s"
          subtitle="Instant Mobile Delivery"
          statusText="Target < 2.0s"
          statusVariant="emerald"
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          title="System Uptime"
          value="99.98%"
          subtitle="Real-Time Protection"
          statusText="High Availability"
          statusVariant="cyan"
          icon={<Activity className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* Before vs After Impact Highlight Banner */}
      <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" /> Security Performance Impact
          </h3>
          <Badge variant="cyan">SYSTEM RESULTS</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase">Daily False Positive Notifications</span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-rose-400 line-through">99+ pings/day</span>
              <span className="text-2xl font-bold text-slate-400">→</span>
              <span className="text-3xl font-extrabold text-emerald-400">&lt;4 verified/day</span>
            </div>
            <p className="text-xs text-slate-400">97% reduction achieved via Triple-Gate AI decision logic.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase">Resident Time Wasted on Log Checks</span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-rose-400 line-through">20 mins/day</span>
              <span className="text-2xl font-bold text-slate-400">→</span>
              <span className="text-3xl font-extrabold text-emerald-400">&lt;1 min/day</span>
            </div>
            <p className="text-xs text-slate-400">Eliminates notification fatigue and unmuting frustration.</p>
          </div>
        </div>
      </Card>

      {/* 6 Recharts Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart 1 */}
        <Card className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Before vs After Metrics</h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beforeAfterData}>
                <XAxis dataKey="metric" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="before" fill="#ef4444" name="Before SVS" />
                <Bar dataKey="after" fill="#10b981" name="After SVS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2 */}
        <Card className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alert Distribution by Hour</h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyAlerts}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Area type="monotone" dataKey="alerts" stroke="#00f0ff" fill="rgba(0, 240, 255, 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3 */}
        <Card className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Detection Confidence Spread</h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceDist}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4 */}
        <Card className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alert Latency Histogram (Sec)</h4>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyHist}>
                <XAxis dataKey="second" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
