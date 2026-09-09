import React from 'react';
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
  Cpu,
  LogOut,
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

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live-monitor', label: 'Live Monitor', icon: Eye, badge: 'LIVE' },
    { id: 'alerts', label: 'Alerts', icon: Bell, count: activeAlertCount },
    { id: 'people', label: 'People', icon: Users },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'zones', label: 'Detection Zones', icon: MapPin },
    { id: 'history', label: 'Event History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0e1a] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      <div>
        {/* Top Logo Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-cyan-glow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              SVS <span className="text-[10px] text-cyan-400 font-mono font-normal">v1.0</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Smart Vision Sentry
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/40 text-cyan-300 shadow-cyan-glow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
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
        </nav>
      </div>

      {/* Bottom Status & Profile */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-[#070a14]">
        {/* Edge AI Status Indicator */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-200">Edge AI: {metrics.edgeStatus}</p>
              <p className="text-[10px] text-slate-400 font-mono">10 FPS • Local INT8</p>
            </div>
          </div>
          <Badge variant="emerald" pulse>ONLINE</Badge>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover"
            />
            <div className="truncate max-w-[110px]">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
