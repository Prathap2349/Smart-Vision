import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import {
  LayoutDashboard,
  Eye,
  Users,
  Bell,
  BarChart3,
  Cpu,
  MapPin,
  Settings,
  Shield,
  LogOut,
  Radio,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export type NavTab =
  | 'overview'
  | 'live-monitor'
  | 'people'
  | 'alerts'
  | 'analytics'
  | 'health'
  | 'zones'
  | 'cameras'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const { alerts, metrics, cameras } = useSecurity();

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const onlineCameras = cameras.filter(c => c.status === 'ONLINE').length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live-monitor', label: 'Live Cameras', icon: Eye, badge: `${onlineCameras} LIVE` },
    { id: 'people', label: 'People', icon: Users },
    { id: 'alerts', label: 'Events', icon: Bell, count: activeAlertCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'health', label: 'System', icon: Cpu },
  ];

  const secondaryItems = [
    { id: 'zones', label: 'Detection Zones', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      <div>
        {/* Top Logo & Title */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5 leading-none">
              SMART VISION <span className="text-[10px] text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/30">SENTRY</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider uppercase mt-1">
              AI Vision Command Center
            </p>
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">
            Command Center
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#111728]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-rose-600 text-white animate-pulse">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-800/80 mt-3">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest px-3 py-1.5">
              Configuration
            </div>
            {secondaryItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#111728]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Status & Profile */}
      <div className="p-3 border-t border-slate-800/80 space-y-2.5 bg-[#070b13]">
        {/* System Online Badge */}
        <div className="p-2.5 rounded-lg bg-[#0d1424] border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <div className="truncate">
              <p className="text-[11px] font-bold text-white leading-tight">System Online</p>
              <p className="text-[10px] font-mono text-emerald-400 leading-tight">Edge AI Active</p>
            </div>
          </div>
          <StatusBadge status="ONLINE" size="sm" />
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
              {user?.name ? user.name[0] : 'S'}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{user?.name || 'Operator'}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight font-mono">{user?.role || 'SecOps'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
