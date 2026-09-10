import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import {
  LayoutDashboard,
  Eye,
  Bell,
  Users,
  Camera,
  MapPin,
  History,
  BarChart3,
  Activity,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export type NavTab =
  | 'overview'
  | 'live-monitor'
  | 'alerts'
  | 'people'
  | 'cameras'
  | 'zones'
  | 'history'
  | 'analytics'
  | 'health'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const { alerts, metrics } = useSecurity();
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(
    ['health', 'analytics', 'zones', 'history'].includes(currentTab)
  );

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;

  const primaryNavItems = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'live-monitor', label: 'Live Stream', icon: Eye, badge: 'LIVE' },
    { id: 'alerts', label: 'Security Alerts', icon: Bell, count: activeAlertCount },
    { id: 'people', label: 'Family & Whitelist', icon: Users },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const advancedNavItems = [
    { id: 'zones', label: 'Detection Zones', icon: MapPin },
    { id: 'history', label: 'Event Logs', icon: History },
    { id: 'analytics', label: 'Analytics & Benchmarks', icon: BarChart3 },
    { id: 'health', label: 'System Health', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      <div>
        {/* Top Logo Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative group">
            <Shield className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Smart Vision <span className="text-[10px] text-indigo-400 font-bold">v1.0</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Smart Home Security
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {/* Primary Consumer Tabs */}
          <div className="space-y-1">
            {primaryNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && <Badge variant="cyan">{item.badge}</Badge>}
                  {item.count !== undefined && item.count > 0 && (
                    <Badge variant="rose" pulse>
                      {item.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Advanced Collapsible Section */}
          <div className="pt-3 border-t border-slate-800/80 mt-3">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Advanced Operations
              </span>
              {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {advancedOpen && (
              <div className="mt-1 space-y-1 pl-2 border-l-2 border-slate-800 ml-3 animate-fadeIn">
                {advancedNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id as NavTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/90 text-white font-bold shadow-md shadow-indigo-600/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Bottom Status & Profile */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950">
        {/* All Quiet Brand Mascot Status Indicator */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-200">Status: {metrics.edgeStatus}</p>
              <p className="text-[10px] text-emerald-400">All Quiet &amp; Secured</p>
            </div>
          </div>
          <Badge variant="emerald" pulse>ARMED</Badge>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
            />
            <div className="truncate max-w-[110px]">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
