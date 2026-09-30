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
  LogOut,
} from 'lucide-react';
import { AIStatusOrb } from '../ui/AIStatusOrb';

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
  const allOnline = cameras.length > 0 && onlineCameras === cameras.length;

  const primaryNav = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'cameras', label: 'Cameras', icon: Camera, badge: cameras.length > 0 ? `${onlineCameras}/${cameras.length}` : undefined },
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
    <>
    <aside className="hidden md:flex w-64 bg-aurora-surface/80 backdrop-blur-xl border-r border-white/10 flex-col justify-between h-screen sticky top-0 z-40 select-none">
      <div>
        {/* Top Logo & Title */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-violet flex items-center justify-center shadow-lg shadow-brand-blue/25 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-text-primary leading-tight">
              Smart Vision
            </h1>
            <p className="text-xs text-text-muted font-medium mt-0.5">
              Smart home protection
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 py-1.5">
            Menu
          </div>

          {primaryNav.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.id === 'cameras' && currentTab === 'live-monitor');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-blue/15 text-brand-cyan font-bold border border-brand-blue/30 shadow-blue-glow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-cyan' : 'text-text-muted'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-brand-success/15 text-brand-success border border-brand-success/30">
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-alert text-white shadow-rose-glow">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-white/10 mt-3">
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 py-1.5">
              Preferences
            </div>
            {secondaryNav.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-blue/15 text-brand-cyan font-bold border border-brand-blue/30 shadow-blue-glow'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-cyan' : 'text-text-muted'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Status & Profile */}
      <div className="p-3 border-t border-white/10 space-y-2.5 bg-aurora-bg/50">
        {/* System Status Card */}
        <div className="p-3 rounded-xl bg-aurora-elevated/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <AIStatusOrb status={activeAlertCount > 0 ? 'ALERT' : allOnline ? 'ACTIVE' : 'WARNING'} size="sm" />
            <div className="truncate">
              <p className="text-xs font-bold text-text-primary leading-tight">
                {activeAlertCount > 0 ? 'Attention needed' : 'Home protected'}
              </p>
              <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                {cameras.length === 0 ? 'No cameras' : `${onlineCameras} camera${onlineCameras !== 1 ? 's' : ''} online`}
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-xs font-bold text-brand-cyan shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'H'}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-bold text-text-primary truncate leading-tight">{user?.name || 'Homeowner'}</p>
              <p className="text-[11px] text-text-muted truncate leading-tight">Household admin</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-text-muted hover:text-brand-alert rounded-xl hover:bg-white/10 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around border-t border-white/10 bg-aurora-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      {[...primaryNav.slice(0, 6), secondaryNav[1]].map(item => {
        const Icon = item.icon;
        const isActive = currentTab === item.id || (item.id === 'cameras' && currentTab === 'live-monitor');
        return <button key={item.id} onClick={() => onSelectTab(item.id as NavTab)} aria-current={isActive ? 'page' : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${isActive ? 'text-brand-cyan' : 'text-text-muted hover:text-text-primary'}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </button>;
      })}
    </nav>
    </>
  );
};
