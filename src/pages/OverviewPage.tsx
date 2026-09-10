import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DecisionPipelineWidget } from '../components/common/DecisionPipelineWidget';
import { CCTVCanvasPlayer } from '../components/common/CCTVCanvasPlayer';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  Clock,
  Cpu,
  ArrowDownRight,
  TrendingUp,
  ArrowRight,
  Eye,
  Bell,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const beforeAfterData = [
  { name: 'Traditional CCTV', falseAlarms: 99 },
  { name: 'Smart Vision Sentry', falseAlarms: 3 },
];

const hourlyEventsData = [
  { hour: '00:00', humans: 0, residents: 0, threats: 0 },
  { hour: '04:00', humans: 1, residents: 0, threats: 0 },
  { hour: '08:00', humans: 6, residents: 5, threats: 0 },
  { hour: '12:00', humans: 4, residents: 3, threats: 0 },
  { hour: '16:00', humans: 5, residents: 4, threats: 0 },
  { hour: '20:00', humans: 2, residents: 1, threats: 1 },
];

const pieData = [
  { name: 'Whitelisted Residents', value: 14, color: '#10b981' },
  { name: 'Unknown Persons', value: 4, color: '#ef4444' },
];

interface OverviewPageProps {
  onNavigateTab?: (tab: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const { metrics, alerts, finalDecision, residents, unknownPersons } = useSecurity();

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
  const isThreatActive = finalDecision === 'VERIFIED_THREAT' || activeAlerts > 0;
  const totalDetected = residents.length + unknownPersons.length;

  return (
    <div className="space-y-6">
      {/* Resident Hero Status Card */}
      <Card
        className={`p-6 border transition-all duration-500 shadow-xl ${
          isThreatActive
            ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/50 shadow-rose-900/20 animate-pulse'
            : 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border-emerald-500/30 shadow-emerald-950/20'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                isThreatActive
                  ? 'bg-rose-600 text-white shadow-rose-600/30'
                  : 'bg-emerald-600 text-white shadow-emerald-600/30'
              }`}
            >
              {isThreatActive ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  {isThreatActive ? '🚨 1 Unknown Visitor Waiting Outside' : '✓ All Quiet — Front Corridor Secured'}
                </h2>
                <Badge variant={isThreatActive ? 'rose' : 'emerald'} pulse>
                  {isThreatActive ? 'ALERT FIRED' : 'SAFE'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isThreatActive
                  ? 'An unrecognized person has been lingering near your front door for > 20s. Alert sent to phone.'
                  : 'AI is watching your corridor. Environmental motion (wind, animals, leaves) is filtered automatically.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('live-monitor')}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Camera Feed</span>
                </button>

                <button
                  onClick={() => onNavigateTab('alerts')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold transition flex items-center gap-2"
                >
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>Alert History ({alerts.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="False Alarms Today"
          value={3}
          subtitle="99+ → <4 verified/day"
          statusText="97% Reduction"
          statusVariant="emerald"
          icon={<ArrowDownRight className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          title="Verified Threats"
          value={activeAlerts}
          subtitle="Loitering > 20s"
          statusText={activeAlerts > 0 ? 'Requires Attention' : 'All Clear'}
          statusVariant={activeAlerts > 0 ? 'rose' : 'emerald'}
          icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
        />

        <MetricCard
          title="Humans Detected"
          value={totalDetected}
          subtitle="Smart AI Detection"
          statusText="Today"
          statusVariant="cyan"
          icon={<Users className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          title="Residents Recognized"
          value={residents.length}
          subtitle="Face Recognition"
          statusText="Whitelisted"
          statusVariant="emerald"
          icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          title="Average Alert Latency"
          value="1.4s"
          subtitle="Target: <2.0s"
          statusText="Optimal Speed"
          statusVariant="emerald"
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
        />

        <MetricCard
          title="Edge AI Status"
          value="ONLINE"
          subtitle={`CPU ${metrics.cpuUsage}% | GPU ${metrics.gpuUsage}%`}
          statusText="Active Protection"
          statusVariant="cyan"
          icon={<Cpu className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* Main Grid Section: Live Monitor Canvas + AI Decision Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" /> Active CCTV Live Stream
            </h2>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('live-monitor')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                Expand Live Monitor <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <CCTVCanvasPlayer />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <DecisionPipelineWidget />
        </div>
      </div>

      {/* Product Experience Comparison: Traditional CCTV vs Smart Vision Sentry */}
      <Card className="border-cyan-500/30 bg-gradient-to-r from-[#0d1628] to-[#0a1120]">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> How Smart Vision Eliminates False Alarms
          </h3>
          <Badge variant="cyan">TRIPLE-GATE PROTECTION</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional CCTV */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
              <span>TRADITIONAL CCTV ALARMS</span>
              <Badge variant="rose">99+ FALSE ALARMS/DAY</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Basic pixel-difference motion sensors evaluate &ldquo;Did pixels change?&rdquo; Wind, foliage, shadows, and lighting constantly trigger false alerts.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Pixel Motion</span>
              <span>→</span>
              <span>Raw Push Ping</span>
              <span>→</span>
              <span className="text-rose-400 font-bold">Muted App</span>
            </div>
          </div>

          {/* Smart Vision Sentry */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-xs">
              <span>SMART VISION SENTRY</span>
              <Badge variant="emerald">&lt;4 VERIFIED ALERTS/DAY</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Semantic AI filters environmental noise. Requires 3 simultaneous conditions: <span className="text-cyan-300 font-bold">Human + Dwell &gt; 20s + Unknown Face</span>.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-slate-800">
              <span className="text-cyan-400 font-bold">1. Human Detect</span>
              <span>→</span>
              <span className="text-blue-400 font-bold">2. Dwell Track</span>
              <span>→</span>
              <span className="text-emerald-400 font-bold">3. Resident Check</span>
              <span>→</span>
              <span className="text-emerald-400 font-bold">&lt;2s Alert</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 1: Before vs After */}
        <Card className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Daily False Alarm Reduction
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beforeAfterData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  itemStyle={{ color: '#00f0ff' }}
                />
                <Bar dataKey="falseAlarms" fill="#ef4444" radius={[6, 6, 0, 0]}>
                  {beforeAfterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: 24h Detection Timeline */}
        <Card className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            24-Hour Detection Events
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyEventsData}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Area type="monotone" dataKey="humans" stroke="#00f0ff" fill="rgba(0, 240, 255, 0.15)" />
                <Area type="monotone" dataKey="residents" stroke="#10b981" fill="rgba(16, 185, 129, 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Resident vs Unknown Pie */}
        <Card className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Resident vs Unknown Breakdown
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
