import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoSimulationBar } from '../common/DemoSimulationBar';
import { FalsePositiveModal } from '../common/FalsePositiveModal';
import { HikvisionSetupModal } from '../common/HikvisionSetupModal';
import { useSecurity } from '../../context/SecurityContext';

interface MainLayoutProps {
  children: (tab: NavTab, setTab: (t: NavTab) => void) => React.ReactNode;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: { title: 'Security Overview', subtitle: 'AI-powered residential CCTV intelligence' },
  'live-monitor': { title: 'Live Monitor', subtitle: '1080p RTSP Stream & Real-time AI Decision Pipeline' },
  alerts: { title: 'Security Alerts', subtitle: 'Incident management and false alarm verification audit' },
  people: { title: 'People & Residents', subtitle: 'Prototype face biometrics whitelisting & unknown subjects' },
  cameras: { title: 'Camera Management', subtitle: 'Edge RTSP streams, resolutions & processing latency' },
  zones: { title: 'Detection Zones', subtitle: 'Virtual tripwire ROI geometry & dwell thresholds' },
  history: { title: 'Event History', subtitle: 'Filterable temporal audit trail of all security events' },
  analytics: { title: 'Analytics & Impact', subtitle: 'Target 99+ → <4 false-alarm reduction metrics & benchmark charts' },
  health: { title: 'System Health', subtitle: 'Edge AI hardware utilization, temperature & node graph' },
  settings: { title: 'System Settings', subtitle: 'YOLOv8, Lightweight IoU Tracker, Telegram API & Privacy configurations' },
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const { hikvisionSetupModalOpen, setHikvisionSetupModalOpen, connectCamera } = useSecurity();

  const { title, subtitle } = TAB_TITLES[currentTab];

  return (
    <div className="flex min-h-screen bg-[#070a12] text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <Topbar title={title} subtitle={subtitle} />

        {/* Demo Simulation Control Banner */}
        <DemoSimulationBar />

        {/* Dynamic Page View */}
        <main className="p-6 flex-1 space-y-6 overflow-y-auto">
          {children(currentTab, setCurrentTab)}
        </main>
      </div>

      {/* Global Modals */}
      <FalsePositiveModal />
      <HikvisionSetupModal
        isOpen={hikvisionSetupModalOpen}
        onClose={() => setHikvisionSetupModalOpen(false)}
        onSuccessConnect={connectCamera}
      />
    </div>
  );
};
