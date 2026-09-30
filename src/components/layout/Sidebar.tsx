import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import {
  Home,
  Camera,
  Activity as ActivityIcon,
  Bell,
  Users,
  BarChart3,
  Cpu,
  MapPin,
  Settings,
  Shield,
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

export type NavTab =
  | 'overview'
  | 'live-monitor'
  | 'cameras'
  | 'history'
  | 'alerts'
  | 'people'
  | 'analytics'
  | 'health'
  | 'zones'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const { alerts, cameras } = useSecurity();

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const onlineCameras = cameras.filter(c => c.status === 'ONLINE').length;

  const primaryNav = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'cameras', label: 'Cameras', icon: Camera, badge: `${onlineCameras} Online` },
    { id: 'history', label: 'Activity', icon: ActivityIcon },
    { id: 'alerts', label: 'Alerts', icon: Bell, count: activeAlertCount },
    { id: 'people', label: 'People', icon: Users },
    { id: 'analytics', label: 'Insights', icon: BarChart3 },
    { id: 'health', label: 'System', icon: Cpu },
  ];

  const secondaryNav = [
    { id: 'zones', label: 'Protected Areas', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none shadow-xs">
      <div>
        {/* Top Logo & Title */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
              Smart Vision
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Smart home protection
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">
            Menu
          </div>

          {primaryNav.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.id === 'cameras' && currentTab === 'live-monitor');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white shadow-xs">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 mt-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">
              Preferences
            </div>
            {secondaryNav.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Status & Profile */}
      <div className="p-3 border-t border-slate-100 space-y-2.5 bg-slate-50/70">
        {/* System Protected Card */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 leading-tight">System protected</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {onlineCameras} cameras online
              </p>
            </div>
          </div>
          <StatusBadge variant="success" size="sm" label="Active" />
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'H'}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.name || 'Homeowner'}</p>
              <p className="text-[11px] text-slate-500 truncate leading-tight">Household admin</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-200/60 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
